"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Box,
  Typography,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
  Button,
  Divider,
  Chip,
  Alert,
  Snackbar,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import LockIcon from "@mui/icons-material/Lock";

// ----------------------------------------------------------------------
// 1. Child Component: Defined OUTSIDE the main component to fix focus issues
// ----------------------------------------------------------------------
function CategoryManager({
  title,
  type,
  categories,
  counts,
  currentUser,
  onAdd,
  onDelete,
}) {
  const [inputValue, setInputValue] = useState("");

  const handleAddClick = () => {
    if (!inputValue.trim()) return;
    onAdd(inputValue, type);
    setInputValue(""); // Clear local input after adding
  };

  const filteredCategories = categories.filter((c) => c.type === type);

  return (
    <Paper
      sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column" }}
    >
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>

      {/* Input Section */}
      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        <TextField
          size="small"
          placeholder="New Category Name"
          fullWidth
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddClick();
          }}
        />
        <Button
          variant="contained"
          onClick={handleAddClick}
          disabled={!inputValue.trim()}
        >
          Add
        </Button>
      </Box>
      <Divider />

      {/* List Section */}
      <List dense sx={{ flexGrow: 1, overflow: "auto", maxHeight: 400 }}>
        {filteredCategories.map((c) => {
          const isSystem = c.user_id === null;
          // Check if it belongs to current user
          const isMine = currentUser && c.user_id === currentUser;

          return (
            <ListItem
              key={c.id}
              divider
              secondaryAction={
                <IconButton
                  edge="end"
                  onClick={() => onDelete(c.id, isSystem)}
                  disabled={isSystem || counts[c.id] > 0}
                >
                  {isSystem ? (
                    <LockIcon color="disabled" fontSize="small" />
                  ) : (
                    <DeleteIcon
                      color={counts[c.id] > 0 ? "disabled" : "error"}
                    />
                  )}
                </IconButton>
              }
            >
              <ListItemText
                primary={
                  <Box
                    component="span"
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  >
                    {c.name}
                    {isSystem && (
                      <Chip
                        label="System"
                        size="small"
                        color="default"
                        sx={{ height: 20, fontSize: "0.6rem" }}
                      />
                    )}
                    {isMine && (
                      <Chip
                        label="Personal"
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ height: 20, fontSize: "0.6rem" }}
                      />
                    )}
                  </Box>
                }
                secondary={`${counts[c.id] || 0} transactions`}
              />
            </ListItem>
          );
        })}
        {filteredCategories.length === 0 && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ p: 2, textAlign: "center" }}
          >
            No categories found.
          </Typography>
        )}
      </List>
    </Paper>
  );
}

// ----------------------------------------------------------------------
// 2. Main Parent Component
// ----------------------------------------------------------------------
export default function Admin() {
  const [categories, setCategories] = useState([]);
  const [counts, setCounts] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [toast, setToast] = useState({ open: false, msg: "", type: "info" });

  useEffect(() => {
    fetchUserAndData();
  }, []);

  const fetchUserAndData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUser(user?.id);
    fetchData();
  };

  const fetchData = async () => {
    // Fetch Categories
    const { data: catData, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    if (!error) setCategories(catData || []);

    // Fetch Usage Counts
    const { data: transData } = await supabase
      .from("transactions")
      .select("category1_id, category2_id");
    const countMap = {};
    transData?.forEach((t) => {
      countMap[t.category1_id] = (countMap[t.category1_id] || 0) + 1;
      countMap[t.category2_id] = (countMap[t.category2_id] || 0) + 1;
    });
    setCounts(countMap);
  };

  const handleAdd = async (name, type) => {
    // Database Insert
    const { error } = await supabase
      .from("categories")
      .insert([{ name: name.trim(), type: type }])
      .select();

    if (error) {
      if (error.code === "23505") {
        setToast({
          open: true,
          msg: "This category already exists!",
          type: "error",
        });
      } else {
        setToast({ open: true, msg: error.message, type: "error" });
      }
    } else {
      setToast({
        open: true,
        msg: "Category added successfully",
        type: "success",
      });
      fetchData(); // Refresh list
    }
  };

  const handleDelete = async (id, isSystem) => {
    if (isSystem) {
      setToast({
        open: true,
        msg: "Cannot delete System Categories.",
        type: "warning",
      });
      return;
    }
    if (counts[id] > 0) {
      setToast({
        open: true,
        msg: `Cannot delete: Used in ${counts[id]} transactions.`,
        type: "warning",
      });
      return;
    }
    if (!confirm("Are you sure you want to delete this category?")) return;

    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) {
      setToast({ open: true, msg: error.message, type: "error" });
    } else {
      setToast({ open: true, msg: "Category deleted", type: "success" });
      fetchData();
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Category Management
      </Typography>
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <CategoryManager
            title="Manage Types (Income/Expense)"
            type="c1"
            categories={categories}
            counts={counts}
            currentUser={currentUser}
            onAdd={handleAdd}
            onDelete={handleDelete}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <CategoryManager
            title="Manage Sources (Groceries/Rent)"
            type="c2"
            categories={categories}
            counts={counts}
            currentUser={currentUser}
            onAdd={handleAdd}
            onDelete={handleDelete}
          />
        </Grid>
      </Grid>

      {/* Feedback Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={toast.type}
          onClose={() => setToast({ ...toast, open: false })}
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
