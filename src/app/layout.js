"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CurrencyProvider } from "@/lib/CurrencyContext";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Stack,
  Button,
  IconButton,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ReceiptIcon from "@mui/icons-material/Receipt";
import SettingsIcon from "@mui/icons-material/Settings";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import LoginIcon from "@mui/icons-material/Login";
import MenuIcon from "@mui/icons-material/Menu"; // <--- Hamburger Icon
import AssessmentIcon from "@mui/icons-material/Assessment";
import Link from "next/link";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2" },
    secondary: { main: "#dc004e" },
    background: { default: "#f4f6f8" },
  },
});

const drawerWidth = 240;

export default function RootLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false); // <--- State for Mobile Drawer

  // Toggle function for mobile
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
    };
    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (event === "SIGNED_OUT") router.push("/login");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (pathname === "/login")
    return (
      <html lang="en">
        <body>{children}</body>
      </html>
    );

  const navItems = [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/" },
    { text: "Transactions", icon: <ReceiptIcon />, path: "/transactions" },
    { text: "Reports", icon: <AssessmentIcon />, path: "/reports" },
    { text: "Admin Panel", icon: <SettingsIcon />, path: "/admin" },
  ];

  if (user) {
    navItems.push({
      text: "My Profile",
      icon: <PersonIcon />,
      path: "/profile",
    });
  }

  // --- DRAWER CONTENT (Shared between Mobile & Desktop) ---
  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar>
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{ color: "primary.main", fontWeight: "bold" }}
        >
          Finance Tracker
        </Typography>
      </Toolbar>
      <Divider />

      {/* Scrollable List Area */}
      <Box sx={{ overflow: "auto", flexGrow: 1 }}>
        <List>
          {user &&
            navItems.map((item) => (
              <Link
                href={item.path}
                key={item.text}
                style={{ textDecoration: "none", color: "inherit" }}
                onClick={() => setMobileOpen(false)}
              >
                <ListItem disablePadding>
                  <ListItemButton selected={pathname === item.path}>
                    <ListItemIcon
                      sx={{
                        color:
                          pathname === item.path ? "primary.main" : "inherit",
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.text} />
                  </ListItemButton>
                </ListItem>
              </Link>
            ))}
        </List>
      </Box>

      <Divider />

      {/* Bottom User Section */}
      {!loading && user ? (
        <>
          <Box sx={{ p: 2, bgcolor: "#e3f2fd" }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: "primary.main", width: 32, height: 32 }}>
                {user.email?.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ overflow: "hidden" }}>
                <Typography
                  variant="caption"
                  display="block"
                  noWrap
                  fontWeight="bold"
                >
                  {user.email}
                </Typography>
              </Box>
            </Stack>
          </Box>
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon color="error" />
                </ListItemIcon>
                <ListItemText
                  primary="Logout"
                  primaryTypographyProps={{ color: "error" }}
                />
              </ListItemButton>
            </ListItem>
          </List>
        </>
      ) : (
        <List>
          <Link
            href="/login"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <ListItem disablePadding>
              <ListItemButton>
                <ListItemIcon>
                  <LoginIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Sign In / Register"
                  primaryTypographyProps={{
                    color: "primary",
                    fontWeight: "bold",
                  }}
                />
              </ListItemButton>
            </ListItem>
          </Link>
        </List>
      )}
    </Box>
  );

  return (
    <html lang="en">
      <body>
        <ThemeProvider theme={theme}>
          <CurrencyProvider>
            <CssBaseline />
            <Box sx={{ display: "flex" }}>
              {/* --- APP BAR --- */}
              <AppBar
                position="fixed"
                sx={{
                  zIndex: (theme) => theme.zIndex.drawer + 1,
                  // On Desktop: Shrink AppBar width to make room for sidebar
                  width: { sm: `calc(100% - ${drawerWidth}px)` },
                  ml: { sm: `${drawerWidth}px` },
                }}
              >
                <Toolbar>
                  {/* Hamburger Menu (Only visible on Mobile 'xs') */}
                  <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    edge="start"
                    onClick={handleDrawerToggle}
                    sx={{ mr: 2, display: { sm: "none" } }}
                  >
                    <MenuIcon />
                  </IconButton>
                  <Typography variant="h6" noWrap component="div">
                    Finance Tracker
                  </Typography>
                </Toolbar>
              </AppBar>

              {/* --- NAVIGATION DRAWERS --- */}
              <Box
                component="nav"
                sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
              >
                {/* 1. Mobile Drawer (Temporary) */}
                <Drawer
                  variant="temporary"
                  open={mobileOpen}
                  onClose={handleDrawerToggle}
                  ModalProps={{ keepMounted: true }} // Better open performance on mobile
                  sx={{
                    display: { xs: "block", sm: "none" },
                    "& .MuiDrawer-paper": {
                      boxSizing: "border-box",
                      width: drawerWidth,
                    },
                  }}
                >
                  {drawerContent}
                </Drawer>

                {/* 2. Desktop Drawer (Permanent) */}
                <Drawer
                  variant="permanent"
                  sx={{
                    display: { xs: "none", sm: "block" },
                    "& .MuiDrawer-paper": {
                      boxSizing: "border-box",
                      width: drawerWidth,
                    },
                  }}
                  open
                >
                  {drawerContent}
                </Drawer>
              </Box>

              {/* --- MAIN CONTENT --- */}
              <Box
                component="main"
                sx={{
                  flexGrow: 1,
                  // Responsive Padding: Less on mobile (2), More on desktop (3)
                  p: { xs: 2, sm: 3 },

                  // Responsive Width: 100% on mobile, subtract drawer on desktop
                  width: { sm: `calc(100% - ${drawerWidth}px)` },

                  // Fixes for Horizontal Scroll
                  mt: 8, // Push down below AppBar
                  // overflowX: "hidden", // PREVENTS HORIZONTAL SCROLL
                  minWidth: 0, // Allows charts/tables to shrink properly
                  display: "flex", // Ensures vertical stacking
                  flexDirection: "column",
                }}
              >
                {!loading && !user ? (
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    mt={10}
                  >
                    <Typography
                      variant="h5"
                      color="text.secondary"
                      gutterBottom
                    >
                      Please Sign In
                    </Typography>
                    <Button
                      variant="contained"
                      LinkComponent={Link}
                      href="/login"
                    >
                      Go to Login
                    </Button>
                  </Box>
                ) : (
                  children
                )}
              </Box>
            </Box>
          </CurrencyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
