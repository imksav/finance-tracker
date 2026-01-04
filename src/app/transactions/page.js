"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useCurrency } from "@/lib/CurrencyContext";
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Typography,
  Paper,
  IconButton,
  Chip,
  Stack,
  Card,
  CardContent,
  Divider,
  InputAdornment,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Container,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney"; // Or Currency icon
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import * as XLSX from "xlsx";
import { format } from "date-fns"; // Standard date formatting

export default function Transactions() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { currency } = useCurrency();

  const [transactions, setTransactions] = useState([]);
  const [cats1, setCats1] = useState([]);
  const [cats2, setCats2] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Form State
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    note: "",
    c1: "",
    c2: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setFetching(true);
    // 1. Get Categories
    const { data: catData } = await supabase.from("categories").select("*");
    if (catData) {
      setCats1(catData.filter((c) => c.type === "c1"));
      setCats2(catData.filter((c) => c.type === "c2"));
    }

    // 2. Get Transactions
    const { data: transData, error } = await supabase
      .from("transactions")
      .select(
        `
        id, date, amount, note, created_at,
        category1:categories!category1_id (name),
        category2:categories!category2_id (name)
      `
      )
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }); // Secondary sort for same-day entries

    if (!error) setTransactions(transData);
    setFetching(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.c1 || !form.c2)
      return alert("Please fill all required fields");
    setLoading(true);

    const { error } = await supabase.from("transactions").insert({
      date: form.date,
      amount: form.amount,
      note: form.note,
      category1_id: form.c1,
      category2_id: form.c2,
    });

    if (error) {
      alert(error.message);
    } else {
      setForm({ ...form, amount: "", note: "" }); // Keep date/categories for faster entry
      fetchData();
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this transaction?")) return;
    await supabase.from("transactions").delete().eq("id", id);
    fetchData();
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      transactions.map((t) => ({
        Date: t.date,
        Type: t.category1?.name,
        Category: t.category2?.name,
        Amount: t.amount,
        Note: t.note,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, "finance_data.xlsx");
  };

  // Helper to choose icon/color based on type
  const getTypeStyles = (typeName) => {
    if (typeName === "Income")
      return { color: "success.main", icon: <TrendingUpIcon />, bg: "#e8f5e9" };
    if (typeName === "Expense")
      return { color: "error.main", icon: <TrendingDownIcon />, bg: "#ffebee" };
    if (typeName === "Loan")
      return {
        color: "warning.main",
        icon: <AttachMoneyIcon />,
        bg: "#fff3e0",
      };
    return {
      color: "text.secondary",
      icon: <AttachMoneyIcon />,
      bg: "#f5f5f5",
    };
  };

  return (
    <Container maxWidth="md" disableGutters={isMobile}>
      <Box sx={{ p: isMobile ? 2 : 0 }}>
        {/* Header Section */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Typography variant="h5" fontWeight="bold">
            Transactions
          </Typography>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={exportToExcel}
            size="small"
          >
            Export
          </Button>
        </Stack>

        {/* 1. Add Transaction Form (Card Style) */}
        <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 3 }}>
          <Typography
            variant="subtitle1"
            fontWeight="bold"
            mb={2}
            display="flex"
            alignItems="center"
            gap={1}
          >
            <AddCircleIcon color="primary" /> New Entry
          </Typography>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              {/* Row 1: Amount & Date */}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Amount"
                  type="number"
                  fullWidth
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {currency}
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  type="date"
                  fullWidth
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </Stack>

              {/* Row 2: Categories */}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  select
                  label="Type"
                  fullWidth
                  required
                  value={form.c1}
                  onChange={(e) => setForm({ ...form, c1: e.target.value })}
                >
                  {cats1.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Category"
                  fullWidth
                  required
                  value={form.c2}
                  onChange={(e) => setForm({ ...form, c2: e.target.value })}
                >
                  {cats2.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              {/* Row 3: Note & Button */}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Note"
                  fullWidth
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="What was this for?"
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{ minWidth: 120, height: 56 }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </Stack>
            </Stack>
          </form>
        </Paper>

        {/* 2. Transaction List (Scrollable Card View) */}
        <Typography variant="h6" sx={{ mb: 2, opacity: 0.8 }}>
          History
        </Typography>

        {fetching ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2} sx={{ pb: 10 }}>
            {" "}
            {/* pb:10 gives space at bottom for scrolling */}
            {transactions.map((t) => {
              const styles = getTypeStyles(t.category1?.name);

              return (
                <Card
                  key={t.id}
                  elevation={1}
                  sx={{
                    borderRadius: 3,
                    borderLeft: `6px solid`,
                    borderLeftColor: styles.color,
                    transition: "0.2s",
                    "&:hover": { transform: "translateY(-2px)", boxShadow: 3 },
                  }}
                >
                  <CardContent
                    sx={{
                      p: "16px !important",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    {/* Left: Icon & Info */}
                    <Box display="flex" alignItems="center" gap={2}>
                      <Box
                        sx={{
                          bgcolor: styles.bg,
                          p: 1.5,
                          borderRadius: "50%",
                          display: "flex",
                          color: styles.color,
                        }}
                      >
                        {styles.icon}
                      </Box>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {t.category2?.name || "Uncategorized"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t.note || t.category1?.name}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {format(new Date(t.date), "MMM dd, yyyy")}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Right: Amount & Delete */}
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box textAlign="right">
                        <Typography
                          variant="h6"
                          fontWeight="bold"
                          sx={{ color: styles.color }}
                        >
                          {t.category1?.name === "Expense" ? "-" : "+"}
                          {currency} {t.amount}
                        </Typography>
                      </Box>
                      <IconButton
                        onClick={() => handleDelete(t.id)}
                        size="small"
                        sx={{
                          opacity: 0.5,
                          "&:hover": { opacity: 1, color: "error.main" },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
            {transactions.length === 0 && (
              <Box textAlign="center" py={5} color="text.secondary">
                <Typography>No transactions found.</Typography>
                <Typography variant="caption">
                  Start by adding a new entry above.
                </Typography>
              </Box>
            )}
          </Stack>
        )}
      </Box>
    </Container>
  );
}
