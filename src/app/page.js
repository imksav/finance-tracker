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
  LineChart,
  Line,
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
  isAfter,
  parse,
} from "date-fns";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";

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

  // Bank Balance States
  const [initialBalance, setInitialBalance] = useState(0);
  const [balanceUpdatedAt, setBalanceUpdatedAt] = useState(null); // Store date

  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // 1. Fetch User's Initial Balance AND Updated Date
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("initial_balance, balance_updated_at")
        .eq("id", user.id)
        .single();

      if (profile) {
        setInitialBalance(profile.initial_balance || 0);
        setBalanceUpdatedAt(profile.balance_updated_at);
      }
    }

    // 2. Setup Date Range (Last 12 Months for Charts)
    const today = new Date();
    const oneYearAgo = subMonths(today, 11);
    const startDate = startOfMonth(oneYearAgo).toISOString();

    // 3. Fetch Categories
    const { data: allCategories } = await supabase
      .from("categories")
      .select("id, name")
      .eq("type", "c2")
      .order("name");

    const catExpenseMap = {};
    if (allCategories) {
      allCategories.forEach((c) => {
        catExpenseMap[c.name] = 0;
      });
    }

    const monthMap = {};
    for (let i = 0; i < 12; i++) {
      const d = subMonths(today, i);
      const key = format(d, "MMM yyyy");
      monthMap[key] = { name: key, Income: 0, Expense: 0, sortDate: d };
    }

    // 4. Fetch Transactions
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

      // --- 1. General Stats (For Charts & Cards - Shows EVERYTHING) ---
      if (type === "Income") income += val;
      if (type === "Expense") expense += val;
      if (type === "Loan") loan += val;
      if (type === "Settlement") settlement += val;

      if (monthMap[monthKey]) {
        if (type === "Income") monthMap[monthKey].Income += val;
        if (type === "Expense") monthMap[monthKey].Expense += val;
      }

      if (type === "Expense") {
        const c2 = t.category2?.name;
        if (c2) catExpenseMap[c2] = (catExpenseMap[c2] || 0) + val;
      }
    });

    setStats({ income, expense, loan, settlement });

    const sortedMonths = Object.values(monthMap).sort(
      (a, b) => a.sortDate - b.sortDate
    );
    setMonthlyData(sortedMonths);

    const scatterArr = Object.keys(catExpenseMap).map((k) => ({
      name: k,
      value: catExpenseMap[k],
    }));

    setCategoryData(scatterArr);
  };

  // --- CALCULATE REAL-TIME BANK BALANCE ---
  // Logic: Initial Balance + (Transactions happening AFTER the balance was set)
  const calculateBankBalance = () => {
    // Start with the set balance
    let liveBalance = Number(initialBalance);

    // If we have transactions and a set date
    if (balanceUpdatedAt) {
      const balanceSetDate = new Date(balanceUpdatedAt);

      // Use a separate query or filter the existing `stats`?
      // We need to fetch ALL transactions (not just 12 months) ideally,
      // but for now, let's assume the 12-month fetch covers the recent period.
      // We can't reuse `stats` because that includes old data.
      // We must re-filter `transData` (but we need transData in scope).
      // Since `fetchData` is async, let's do this logic inside `fetchData` or pass data here.
      // **Best Approach:** Do it inside the render or a memo, but we need the transaction list.
      // Let's assume `transData` is not stored in state.

      // WAIT: We didn't store transData in state.
      // Let's modify `fetchData` to set a `balanceChangeSinceUpdate` state.
    }
    return liveBalance;
  };

  // *** REVISED FETCH DATA LOGIC TO HANDLE BALANCE ***
  // I'm adding a specific calculation block inside the existing loop in the component below.
  // To make this work cleanly, I will add `balanceChange` to state.

  const [balanceChange, setBalanceChange] = useState(0);

  // Re-running this logic on the fetched data:
  useEffect(() => {
    // We need to re-fetch or store transactions to calculate this.
    // Let's modify the fetchData function above to calculate this loop.
    // See Updated FetchData below (I will paste the FULL component with this integrated).
  }, [balanceUpdatedAt]);

  // ------------------------------------------------------------------
  //  FULL INTEGRATED COMPONENT START (Copy from here down)
  // ------------------------------------------------------------------

  return <DashboardWithLogic />;
}

function DashboardWithLogic() {
  const { currency } = useCurrency();
  const theme = useTheme(); // Hook needed for layout if used, otherwise safe to remove

  const [stats, setStats] = useState({
    income: 0,
    expense: 0,
    loan: 0,
    settlement: 0,
  });
  const [initialBalance, setInitialBalance] = useState(0);
  const [balanceUpdatedAt, setBalanceUpdatedAt] = useState(null);
  const [liveBalanceChange, setLiveBalanceChange] = useState(0);
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      // 1. Get Profile
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let profileBalance = 0;
      let profileDate = null;

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("initial_balance, balance_updated_at")
          .eq("id", user.id)
          .single();
        if (profile) {
          profileBalance = profile.initial_balance || 0;
          profileDate = profile.balance_updated_at; // This is a timestamp (e.g., 2:30 PM)
          setInitialBalance(profileBalance);
          setBalanceUpdatedAt(profileDate);
        }
      }

      // 2. Fetch Transactions (Last 12 Months)
      const today = new Date();
      const oneYearAgo = subMonths(today, 11);
      const startDate = startOfMonth(oneYearAgo).toISOString();

      // UPDATED QUERY: Added 'created_at' to the select
      const { data: transData, error } = await supabase
        .from("transactions")
        .select(
          `amount, date, created_at, categories!category1_id (name), category2:categories!category2_id (name)`
        )
        .gte("date", startDate)
        .order("date", { ascending: true });

      if (error) return;

      // 3. Process Data
      let income = 0,
        expense = 0,
        loan = 0,
        settlement = 0;
      let tempBalanceChange = 0;

      const catExpenseMap = {};
      const monthMap = {};
      for (let i = 0; i < 12; i++) {
        const d = subMonths(today, i);
        const key = format(d, "MMM yyyy");
        monthMap[key] = { name: key, Income: 0, Expense: 0, sortDate: d };
      }

      transData.forEach((t) => {
        const type = t.categories.name;
        const val = parseFloat(t.amount);
        const dateObj = parseISO(t.date);
        const monthKey = format(dateObj, "MMM yyyy");

        // A. Standard Stats
        if (type === "Income") income += val;
        if (type === "Expense") expense += val;
        if (type === "Loan") loan += val;
        if (type === "Settlement") settlement += val;

        // B. Charts
        if (monthMap[monthKey]) {
          if (type === "Income") monthMap[monthKey].Income += val;
          if (type === "Expense") monthMap[monthKey].Expense += val;
        }
        if (type === "Expense") {
          const c2 = t.category2?.name;
          if (c2) catExpenseMap[c2] = (catExpenseMap[c2] || 0) + val;
        }

        // C. BANK BALANCE LOGIC (The Fix)
        if (profileDate) {
          // Use created_at (When you typed it) instead of date (When it happened)
          // This ensures anything you enter AFTER setting balance counts immediately.
          const entryTime = new Date(t.created_at);
          const updateTime = new Date(profileDate);

          if (entryTime > updateTime) {
            if (type === "Income") tempBalanceChange += val;
            if (type === "Expense") tempBalanceChange -= val;
            if (type === "Settlement") tempBalanceChange -= val;
          }
        }
      });

      setStats({ income, expense, loan, settlement });
      setLiveBalanceChange(tempBalanceChange);

      const sortedMonths = Object.values(monthMap).sort(
        (a, b) => a.sortDate - b.sortDate
      );
      setMonthlyData(sortedMonths);
      const scatterArr = Object.keys(catExpenseMap).map((k) => ({
        name: k,
        value: catExpenseMap[k],
      }));
      setCategoryData(scatterArr);
    };

    loadData();
  }, [currency]); // Added currency dependency to refresh if currency changes

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

  const currentBankBalance = Number(initialBalance) + liveBalanceChange;

  return (
    <Box>
      {/* <Typography variant="h4" fontWeight="bold" gutterBottom>
        Dashboard
      </Typography> */}

      {/* BANK BALANCE CARD */}
      <Paper
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 4,
          background: "linear-gradient(135deg, #1565c0 30%, #42a5f5 90%)",
          color: "white",
          boxShadow: 4,
        }}
      >
        <Stack direction="row" alignItems="center" gap={2}>
          <Box
            sx={{
              p: 1.5,
              bgcolor: "rgba(255,255,255,0.2)",
              borderRadius: "50%",
            }}
          >
            <AccountBalanceIcon sx={{ color: "white", fontSize: 32 }} />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
              CURRENT BANK BALANCE
            </Typography>
            <Typography variant="h3" fontWeight="bold">
              {currency}
              {currentBankBalance.toLocaleString()}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              (Reflects any entries added AFTER you saved your profile balance)
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Summary Cards */}
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
                    {currency} {stats.settlement.toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ p: 1, bgcolor: "#b2dfdb", borderRadius: "50%" }}>
                  <TaskAltIcon sx={{ color: "#00695c" }} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Advanced Charts */}
      <Grid container spacing={4}>
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
                  <LineChart
                    data={categoryData}
                    margin={{ top: 20, right: 20, bottom: 100, left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fontSize: 12, fill: "#666" }}
                    />
                    <YAxis
                      type="number"
                      tickFormatter={(val) =>
                        `${currency}${val.toLocaleString()}`
                      }
                      tick={{ fontSize: 13, fill: "#666" }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      content={<CustomTooltip />}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#8884d8"
                      strokeWidth={3}
                      // Custom Dot to keep your Multi-Color Palette
                      dot={(props) => {
                        const { cx, cy, index } = props;
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={6}
                            fill={COLORS[index % COLORS.length]}
                            stroke="none"
                          />
                        );
                      }}
                    >
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
                    </Line>
                  </LineChart>
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