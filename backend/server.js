const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Supabase project credentials are missing in backend/.env.local!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// GET all accident zones
app.get('/api/accident-zone', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('accident_zones')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error("Database fetch error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST a new accident zone
app.post('/api/accident-zone', async (req, res) => {
  const { name, state, district, pincode, latitude, longitude, danger_level, speed_limit, reporter } = req.body;

  if (!name || !state || !district || !pincode || isNaN(latitude) || isNaN(longitude) || !danger_level || isNaN(speed_limit) || !reporter) {
    return res.status(400).json({ error: "Missing or invalid required fields." });
  }

  try {
    const { data, error } = await supabase
      .from('accident_zones')
      .insert([
        {
          name,
          state,
          district,
          pincode,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          danger_level,
          speed_limit: parseInt(speed_limit, 10),
          reporter
        }
      ])
      .select();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error("Database insert error:", error);
    res.status(500).json({ error: error.message });
  }
});
// POST register a new user
app.post('/api/auth/register', async (req, res) => {
  const { name, mobile, email, password, role } = req.body;

  if (!name || !mobile || !email || !password) {
    return res.status(400).json({ error: "Missing required registration fields." });
  }

  try {
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users_accounts')
      .select('id, mobile, email')
      .or(`mobile.eq.${mobile},email.eq.${email}`)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existingUser) {
      if (existingUser.mobile === mobile) {
        return res.status(400).json({ error: "This mobile number is already registered" });
      }
      if (existingUser.email === email) {
        return res.status(400).json({ error: "This email is already registered" });
      }
    }

    // Insert user
    const { data, error } = await supabase
      .from('users_accounts')
      .insert([
        {
          name,
          mobile,
          email,
          password,
          role: role || 'user'
        }
      ])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST login user
app.post('/api/auth/login', async (req, res) => {
  const { mobile, password, role } = req.body;

  if (!mobile || !password) {
    return res.status(400).json({ error: "Mobile number and password are required." });
  }

  try {
    const { data: user, error } = await supabase
      .from('users_accounts')
      .select('*')
      .eq('mobile', mobile)
      .eq('password', password)
      .eq('role', role || 'user')
      .maybeSingle();

    if (error) throw error;

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials. Please verify your mobile and password." });
    }

    res.json({
      name: user.name,
      mobile: user.mobile,
      role: user.role
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: error.message });
  }
});
// DELETE an accident zone by ID
app.delete('/api/accident-zone/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('accident_zones')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "No changes made. Database RLS policies may be blocking DELETE, or the ID does not exist." });
    }

    res.json({ message: "Accident zone deleted successfully", data });
  } catch (error) {
    console.error("Database delete error:", error);
    res.status(500).json({ error: error.message });
  }
});

// PUT (update) an accident zone by ID
app.put('/api/accident-zone/:id', async (req, res) => {
  const { id } = req.params;
  const { name, state, district, pincode, latitude, longitude, danger_level, speed_limit } = req.body;

  try {
    const { data, error } = await supabase
      .from('accident_zones')
      .update({
        name,
        state,
        district,
        pincode,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        danger_level,
        speed_limit: parseInt(speed_limit, 10)
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "No changes made. Database RLS policies may be blocking UPDATE, or the ID does not exist." });
    }

    res.json({ message: "Accident zone updated successfully", data });
  } catch (error) {
    console.error("Database update error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend Express API running on http://localhost:${PORT}`);
});
