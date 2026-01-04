"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCurrency } from "@/lib/CurrencyContext";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Stack,
  useTheme,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
  LabelList,
  Legend,
} from "recharts";
import {
  format,
  parseISO,
  subMonths,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";

// Professional Palette
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
];

export default function Dashboard() {
  const { currency } = useCurrency();
  const theme = useTheme();

  const [stats, setStats] = useState({
    income: 0,
    expense: 0,
    loan: 0,
    settlement: 0,
  });
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // 1. Setup Date Range (Last 12 Months)
    const today = new Date();
    const oneYearAgo = subMonths(today, 11); // Go back 11 months + current = 12 months
    const startDate = startOfMonth(oneYearAgo).toISOString();

    // 2. Fetch ALL Expense Categories first (to ensure fixed chart size)
    const { data: allCategories } = await supabase
      .from("categories")
      .select("id, name")
      .eq("type", "c2")
      .order("name");

    // Initialize map with ALL categories at 0
    const catExpenseMap = {};
    if (allCategories) {
      allCategories.forEach((c) => {
        catExpenseMap[c.name] = 0;
      });
    }

    // 3. Initialize Monthly Map for last 12 months (ensure no gaps)
    const monthMap = {};
    for (let i = 0; i < 12; i++) {
      const d = subMonths(today, i);
      const key = format(d, "MMM yyyy");
      monthMap[key] = { name: key, Income: 0, Expense: 0, sortDate: d };
    }

    // 4. Fetch Transactions (Last 1 year only)
    const { data: transData, error } = await supabase
      .from("transactions")
      .select(
        `
        amount, date,
        categories!category1_id (name),
        category2:categories!category2_id (name)
      `
      )
      .gte("date", startDate)
      .order("date", { ascending: true });

    if (error) return console.error(error);

    let income = 0,
      expense = 0,
      loan = 0,
      settlement = 0;

    transData.forEach((t) => {
      const type = t.categories.name;
      const val = parseFloat(t.amount);
      const dateObj = parseISO(t.date);
      const monthKey = format(dateObj, "MMM yyyy");

      // Update Totals
      if (type === "Income") income += val;
      if (type === "Expense") expense += val;
      if (type === "Loan") loan += val;
      if (type === "Settlement") settlement += val;

      // Update Monthly Data (if within our 12 month map)
      if (monthMap[monthKey]) {
        if (type === "Income") monthMap[monthKey].Income += val;
        if (type === "Expense") monthMap[monthKey].Expense += val;
      }

      // Update Category Data (Expense Only)
      if (type === "Expense") {
        const c2 = t.category2?.name;
        // Even if category was deleted or new, handle it safely
        if (c2) catExpenseMap[c2] = (catExpenseMap[c2] || 0) + val;
      }
    });

    setStats({ income, expense, loan, settlement });

    // Sort months chronologically
    const sortedMonths = Object.values(monthMap).sort(
      (a, b) => a.sortDate - b.sortDate
    );
    setMonthlyData(sortedMonths);

    // Convert category map to array (Do NOT filter out zeros to keep chart fixed)
    const scatterArr = Object.keys(catExpenseMap).map((k) => ({
      name: k,
      value: catExpenseMap[k],
    }));
    // Optional: Sort alphabetically or by value.
    // Sorting alphabetically keeps the axis position 'constant'.
    // .sort((a, b) => a.name.localeCompare(b.name));

    setCategoryData(scatterArr);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 2, border: "1px solid #ccc", boxShadow: 3 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            {label}
          </Typography>
          {payload.map((entry, index) => (
            <Box
              key={index}
              sx={{
                color: entry.color || entry.fill,
                display: "flex",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Typography variant="body2">{entry.name}:</Typography>
              <Typography variant="body2" fontWeight="bold">
                {currency}
                {entry.value.toLocaleString()}
              </Typography>
            </Box>
          ))}
        </Paper>
      );
    }
    return null;
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Dashboard
      </Typography>

      {/* 1. Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 4, bgcolor: "#e8f5e9", height: "100%" }}>
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
              >
                <Box>
                  <Typography
                    color="textSecondary"
                    variant="subtitle2"
                    fontWeight="bold"
                  >
                    TOTAL INCOME
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    sx={{ mt: 1, color: "#2e7d32" }}
                  >
                    {currency} {stats.income.toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ p: 1, bgcolor: "#c8e6c9", borderRadius: "50%" }}>
                  <ArrowUpwardIcon sx={{ color: "#2e7d32" }} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 4, bgcolor: "#ffebee", height: "100%" }}>
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
              >
                <Box>
                  <Typography
                    color="textSecondary"
                    variant="subtitle2"
                    fontWeight="bold"
                  >
                    TOTAL EXPENSE
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    sx={{ mt: 1, color: "#d32f2f" }}
                  >
                    {currency} {stats.expense.toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ p: 1, bgcolor: "#ffcdd2", borderRadius: "50%" }}>
                  <ArrowDownwardIcon sx={{ color: "#d32f2f" }} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 4, bgcolor: "#e3f2fd", height: "100%" }}>
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
              >
                <Box>
                  <Typography
                    color="textSecondary"
                    variant="subtitle2"
                    fontWeight="bold"
                  >
                    NET BALANCE
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    sx={{
                      mt: 1,
                      color:
                        stats.income - stats.expense >= 0
                          ? "#1565c0"
                          : "#d32f2f",
                    }}
                  >
                    {currency} {(stats.income - stats.expense).toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ p: 1, bgcolor: "#bbdefb", borderRadius: "50%" }}>
                  <AccountBalanceWalletIcon sx={{ color: "#1565c0" }} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 4, bgcolor: "#e0f2f1", height: "100%" }}>
            {" "}
            {/* Teal Background */}
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
              >
                <Box>
                  <Typography
                    color="textSecondary"
                    variant="subtitle2"
                    fontWeight="bold"
                  >
                    TOTAL SETTLED
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    sx={{ mt: 1, color: "#00695c" }}
                  >
                    {currency}
                    {stats.settlement.toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ p: 1, bgcolor: "#b2dfdb", borderRadius: "50%" }}>
                  {/* Icon changed to Handshake/Check to represent settlement */}
                  <TaskAltIcon sx={{ color: "#00695c" }} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 2. Advanced Charts */}
      <Grid container spacing={4}>
        {/* CHART 1: 1-Year Cash Flow (Fixed 12 Months) */}
        <Grid item xs={12}>
          <Paper
            sx={{
              p: 4,
              borderRadius: 4,
              height: 500,
              width: 800,
              boxShadow: 3,
            }}
          >
            <Typography variant="h6" fontWeight="bold" mb={3}>
              Cash Flow Activity (Last 12 Months)
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart
                data={monthlyData}
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e0e0e0"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#666", fontSize: 13 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#666", fontSize: 13 }}
                  tickFormatter={(val) => `${currency}${val / 1000}k`}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "#f5f5f5" }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ paddingTop: "20px" }}
                />
                <Bar
                  dataKey="Income"
                  name="Income"
                  fill="#4caf50"
                  radius={[6, 6, 0, 0]}
                  barSize={30}
                />
                <Bar
                  dataKey="Expense"
                  name="Expense"
                  fill="#ef5350"
                  radius={[6, 6, 0, 0]}
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* CHART 2: Expense Distribution (Scatter - Fixed Overlap) */}
        <Grid item xs={12}>
          <Paper
            sx={{
              p: 4,
              borderRadius: 4,
              height: 500,
              width: 800,
              boxShadow: 3,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography variant="h6" fontWeight="bold" mb={3}>
              Expense Distribution (All Categories)
            </Typography>

            {categoryData.length > 0 ? (
              <Box sx={{ flexGrow: 1, width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart
                    margin={{ top: 20, right: 20, bottom: 100, left: 20 }} // Increased bottom margin for text
                  >
                    <CartesianGrid strokeDasharray="3 3" />

                    {/* X-Axis: Tilted text (-45) to prevent overlap */}
                    <XAxis
                      type="category"
                      dataKey="name"
                      name="Category"
                      interval={0} // Force show ALL labels
                      angle={-45} // Tilt labels
                      textAnchor="end" // Align tilted text correctly
                      height={100} // Reserve space so chart doesn't cover text
                      tick={{ fontSize: 12, fill: "#666" }}
                    />

                    {/* Y-Axis: Currency Values */}
                    <YAxis
                      type="number"
                      dataKey="value"
                      name="Expense"
                      tickFormatter={(val) =>
                        `${currency}${val.toLocaleString()}`
                      }
                      tick={{ fontSize: 13, fill: "#666" }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      content={<CustomTooltip />}
                    />

                    <Scatter name="Expenses" data={categoryData} fill="#8884d8">
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}

                      {/* Value Labels: Only show if value > 0 to avoid clutter */}
                      <LabelList
                        dataKey="value"
                        position="top"
                        formatter={(val) =>
                          val > 0 ? `${currency}${val.toLocaleString()}` : ""
                        }
                        style={{
                          fontSize: 11,
                          fontWeight: "bold",
                          fill: "#333",
                        }}
                        offset={10}
                      />
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Box
                height="100%"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Typography color="textSecondary">
                  Loading categories...
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
