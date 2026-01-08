"use client";
import { useState, useEffect, useRef } from "react"; // Added useRef
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
  Alert, // Added Alert
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import FlightIcon from "@mui/icons-material/Flight";
import * as XLSX from "xlsx";
import { format } from "date-fns";

export default function Transactions() {
  const { currency } = useCurrency();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const fileInputRef = useRef(null); // Reference for hidden file input

  const [transactions, setTransactions] = useState([]);
  const [cats1, setCats1] = useState([]); // Types (Income/Expense)
  const [cats2, setCats2] = useState([]); // Categories (Rent/Food)
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [importMsg, setImportMsg] = useState(null); // Feedback for import

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
      .order("created_at", { ascending: false });

    if (!error) setTransactions(transData || []);
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
      setForm({ ...form, amount: "", note: "" });
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

  // ----------------------------------------------------------------
  // IMPORT LOGIC START
  // ----------------------------------------------------------------
  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws); // Convert to JSON

        if (data.length === 0) {
          setImportMsg({ type: "error", text: "File is empty." });
          return;
        }

        // Prepare Bulk Insert Array
        const newTransactions = [];
        let skipped = 0;

        // Create Helper Maps for fast ID lookup (Name -> ID)
        // e.g. { "Income": "uuid-1", "Expense": "uuid-2" }
        const typeMap = {};
        cats1.forEach((c) => (typeMap[c.name.toLowerCase()] = c.id));

        const catMap = {};
        cats2.forEach((c) => (catMap[c.name.toLowerCase()] = c.id));

        // Loop through Excel rows
        for (const row of data) {
          // Excel Column Names matching: Date, Amount, Type, Category, Note
          // We lowercase keys to be safe
          const rDate = row["Date"] || row["date"];
          const rAmount = row["Amount"] || row["amount"];
          const rType = row["Type"] || row["type"]; // e.g. "Expense"
          const rCat = row["Category"] || row["category"]; // e.g. "Groceries"
          const rNote = row["Note"] || row["note"] || "";

          if (!rDate || !rAmount || !rType || !rCat) {
            skipped++;
            continue; // Skip invalid rows
          }

          // Find IDs
          const typeId = typeMap[rType.toString().trim().toLowerCase()];
          const catId = catMap[rCat.toString().trim().toLowerCase()];

          if (typeId && catId) {
            // Handle Excel Date format if necessary (Excel sometimes returns numbers)
            let finalDate = rDate;
            if (typeof rDate === "number") {
              // Convert Excel serial date to JS Date
              const d = new Date(Math.round((rDate - 25569) * 86400 * 1000));
              finalDate = d.toISOString().split("T")[0];
            }

            newTransactions.push({
              date: finalDate,
              amount: rAmount,
              category1_id: typeId,
              category2_id: catId,
              note: rNote,
            });
          } else {
            skipped++; // Skip if category names don't match database
          }
        }

        if (newTransactions.length > 0) {
          const { error } = await supabase
            .from("transactions")
            .insert(newTransactions);
          if (error) throw error;
          setImportMsg({
            type: "success",
            text: `Imported ${newTransactions.length} transactions! (${skipped} skipped)`,
          });
          fetchData(); // Refresh list
        } else {
          setImportMsg({
            type: "warning",
            text: `No matching categories found. Check your spelling. (${skipped} rows skipped)`,
          });
        }
      } catch (error) {
        console.error(error);
        setImportMsg({
          type: "error",
          text: "Import failed: " + error.message,
        });
      }

      // Reset input so same file can be selected again if needed
      e.target.value = "";
    };
    reader.readAsBinaryString(file);
  };
  // ----------------------------------------------------------------
  // IMPORT LOGIC END
  // ----------------------------------------------------------------

  const getTypeStyles = (typeName) => {
    if (typeName === "Income")
      return { color: "success.main", icon: <TrendingUpIcon />, bg: "#e8f5e9" };
    if (typeName === "Expense")
      return { color: "error.main", icon: <TrendingDownIcon />, bg: "#ffebee" };
    // Settlement gets a specific Look (Teal/Blue)
    if (typeName === "Settlement")
      return {
        color: "#00695c",
        icon: <FlightIcon sx={{ transform: "rotate(45deg)" }} />,
        bg: "#e0f2f1",
      };
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
          <Stack direction="row" spacing={1}>
            {/* Hidden Input */}
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            {/* Import Button */}
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={handleImportClick}
              size="small"
            >
              Import
            </Button>
            {/* Export Button */}
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={exportToExcel}
              size="small"
            >
              Export
            </Button>
          </Stack>
        </Stack>

        {/* Import Message Feedback */}
        {importMsg && (
          <Alert
            severity={importMsg.type}
            onClose={() => setImportMsg(null)}
            sx={{ mb: 2 }}
          >
            {importMsg.text}
          </Alert>
        )}

        {/* Add Form */}
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

        {/* Transaction List */}
        <Typography variant="h6" sx={{ mb: 2, opacity: 0.8 }}>
          History
        </Typography>

        {fetching ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2} sx={{ pb: 10 }}>
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
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box textAlign="right">
                        <Typography
                          variant="h6"
                          fontWeight="bold"
                          sx={{ color: styles.color }}
                        >
                          {t.category1?.name === "Income"
                            ? "+"
                            : t.category1?.name === "Expense"
                            ? "-"
                            : ""}
                          {currency}
                          {t.amount}
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
              </Box>
            )}
          </Stack>
        )}
      </Box>
    </Container>
  );
}
