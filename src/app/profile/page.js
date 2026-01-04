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
  Avatar,
  Divider,
  Alert,
  Stack,
} from "@mui/material";

export default function Profile() {
  const { currency, updateCurrency } = useCurrency();
  const [user, setUser] = useState(null);

  // State for forms
  const [passwords, setPasswords] = useState({ new: "", confirm: "" });
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
    setSelectedCurrency(currency); // Sync with global context on load
  }, [currency]);

  // 1. Handle Currency Save
  const handleSaveSettings = async () => {
    if (!user) return;
    if (!selectedCurrency.trim())
      return setMsg({ type: "error", text: "Currency symbol cannot be empty" });

    setLoading(true);

    // Upsert: Create if doesn't exist, Update if it does
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, currency: selectedCurrency.trim() });

    if (error) {
      setMsg({ type: "error", text: error.message });
    } else {
      setMsg({ type: "success", text: "Preferences updated successfully!" });
      updateCurrency(selectedCurrency.trim()); // Update app globally
    }
    setLoading(false);
  };

  // 2. Handle Password Update
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (passwords.new.length < 6)
      return setMsg({
        type: "error",
        text: "Password too short (min 6 chars)",
      });
    if (passwords.new !== passwords.confirm)
      return setMsg({ type: "error", text: "Passwords do not match" });

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: passwords.new,
    });

    if (error) setMsg({ type: "error", text: error.message });
    else {
      setMsg({ type: "success", text: "Password updated successfully!" });
      setPasswords({ new: "", confirm: "" });
    }
    setLoading(false);
  };

  if (!user)
    return (
      <Box p={4}>
        <Typography>Loading Profile...</Typography>
      </Box>
    );

  return (
    <Box maxWidth="md">
      <Typography variant="h4" gutterBottom fontWeight="bold">
        My Profile
      </Typography>

      {/* Feedback Message */}
      {msg && (
        <Alert severity={msg.type} sx={{ mb: 3 }} onClose={() => setMsg(null)}>
          {msg.text}
        </Alert>
      )}

      {/* ------------------------------------------------ */}
      {/* CARD 1: Preferences (Currency)                   */}
      {/* ------------------------------------------------ */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Preferences
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Set your preferred currency symbol. This will be reflected across your
          dashboard and transactions.
        </Typography>

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            {/* CHANGED: Removed 'select' prop, added helperText */}
            <TextField
              label="Currency Symbol"
              placeholder="e.g. $, £, ₹, Rs, USD"
              fullWidth
              variant="outlined"
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              inputProps={{ maxLength: 5 }} // Optional: Limit length to keep UI clean
              helperText={`${selectedCurrency.length}/5 characters`}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              variant="contained"
              onClick={handleSaveSettings}
              disabled={loading || !selectedCurrency}
              sx={{ height: 56 }} // Match input height
            >
              Save Preferences
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* ------------------------------------------------ */}
      {/* CARD 2: Account Details                          */}
      {/* ------------------------------------------------ */}
      <Paper sx={{ p: 3, mb: 4, bgcolor: "#f8f9fa" }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            sx={{
              width: 64,
              height: 64,
              bgcolor: "primary.main",
              fontSize: "1.5rem",
            }}
          >
            {user.email?.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              Account Email
            </Typography>
            <Typography variant="body1">{user.email}</Typography>
            <Typography variant="caption" color="text.secondary">
              User ID: {user.id}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* ------------------------------------------------ */}
      {/* CARD 3: Security (Password Reset)                */}
      {/* ------------------------------------------------ */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Security
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <form onSubmit={handlePasswordUpdate}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="New Password"
                type="password"
                fullWidth
                required
                value={passwords.new}
                onChange={(e) =>
                  setPasswords({ ...passwords, new: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Confirm Password"
                type="password"
                fullWidth
                required
                value={passwords.confirm}
                onChange={(e) =>
                  setPasswords({ ...passwords, confirm: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="outlined"
                color="primary"
                disabled={loading}
              >
                Update Password
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
}
