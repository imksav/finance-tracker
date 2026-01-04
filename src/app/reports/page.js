"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useCurrency } from "@/lib/CurrencyContext";
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Chip,
  CircularProgress,
} from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import SearchIcon from "@mui/icons-material/Search";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export default function Reports() {
  const { currency } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);

  // Default to current month
  const date = new Date();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const [filters, setFilters] = useState({ start: firstDay, end: lastDay });
  const [stats, setStats] = useState({ income: 0, expense: 0 });

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    // Fetch data within range
    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        date, amount, note,
        category1:categories!category1_id (name),
        category2:categories!category2_id (name)
      `
      )
      .gte("date", filters.start)
      .lte("date", filters.end)
      .order("date", { ascending: false });

    if (error) {
      alert("Error fetching report");
    } else {
      setTransactions(data);

      // Calculate Totals for this period
      let inc = 0,
        exp = 0;
      data.forEach((t) => {
        if (t.category1?.name === "Income") inc += parseFloat(t.amount);
        if (t.category1?.name === "Expense") exp += parseFloat(t.amount);
      });
      setStats({ income: inc, expense: exp });
    }
    setLoading(false);
  };

  // -------------------------
  // EXPORT TO EXCEL
  // -------------------------
  const exportExcel = () => {
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
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `Report_${filters.start}_to_${filters.end}.xlsx`);
  };

  // -------------------------
  // EXPORT TO PDF
  // -------------------------
  const exportPDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.text("Financial Transaction Report", 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Period: ${filters.start} to ${filters.end}`, 14, 30);

    // Summary Section in PDF
    doc.text(`Total Income: ${currency} ${stats.income}`, 14, 40);
    doc.text(`Total Expense: ${currency} ${stats.expense}`, 80, 40);
    doc.text(
      `Net Balance: ${currency} ${stats.income - stats.expense}`,
      150,
      40
    );

    // Table
    const tableColumn = ["Date", "Type", "Category", "Note", "Amount"];
    const tableRows = [];

    transactions.forEach((t) => {
      const transactionData = [
        t.date,
        t.category1?.name,
        t.category2?.name,
        t.note,
        `${currency}${" "}${t.amount}`,
      ];
      tableRows.push(transactionData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      theme: "grid",
      headStyles: { fillColor: [25, 118, 210] }, // Primary Blue
      styles: { fontSize: 10 },
    });

    doc.save(`Report_${filters.start}_to_${filters.end}.pdf`);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Reports & Export
      </Typography>

      {/* 1. Filter Section */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={filters.start}
              onChange={(e) =>
                setFilters({ ...filters, start: e.target.value })
              }
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="End Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={filters.end}
              onChange={(e) => setFilters({ ...filters, end: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={<SearchIcon />}
              onClick={fetchReport}
              disabled={loading}
            >
              {loading ? "Generating..." : "Generate Report"}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* 2. Summary & Actions */}
      {transactions.length > 0 && (
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          {/* Stats Chips */}
          <Stack direction="row" spacing={1}>
            <Chip
              label={`Income: ${currency} ${stats.income}`}
              color="success"
              variant="outlined"
            />
            <Chip
              label={`Expense: ${currency} ${stats.expense}`}
              color="error"
              variant="outlined"
            />
            <Chip
              label={`Net: ${currency} ${stats.income - stats.expense}`}
              color="primary"
            />
          </Stack>

          {/* Export Buttons */}
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              color="success"
              startIcon={<FileDownloadIcon />}
              onClick={exportExcel}
            >
              Excel
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<PictureAsPdfIcon />}
              onClick={exportPDF}
            >
              PDF
            </Button>
          </Stack>
        </Stack>
      )}

      {/* 3. Data Table */}
      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead sx={{ bgcolor: "#f5f5f5" }}>
            <TableRow>
              <TableCell>
                <strong>Date</strong>
              </TableCell>
              <TableCell>
                <strong>Type</strong>
              </TableCell>
              <TableCell>
                <strong>Category</strong>
              </TableCell>
              <TableCell>
                <strong>Note</strong>
              </TableCell>
              <TableCell align="right">
                <strong>Amount</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No records found for this period.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((t, index) => (
                <TableRow key={index} hover>
                  <TableCell>
                    {format(new Date(t.date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={t.category1?.name}
                      size="small"
                      color={
                        t.category1?.name === "Income"
                          ? "success"
                          : t.category1?.name === "Expense"
                          ? "error"
                          : "default"
                      }
                    />
                  </TableCell>
                  <TableCell>{t.category2?.name}</TableCell>
                  <TableCell
                    sx={{
                      maxWidth: 200,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {t.note}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold" }}>
                    {currency} {t.amount}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
