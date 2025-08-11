import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateToken, generateToken, hashPassword, comparePassword, type AuthRequest } from "./auth";
import { insertNoteSchema, registerSchema, loginSchema, User, type RegisterUser, type LoginUser } from "@shared/schema";
import { z } from "zod";

const updateNoteSchema = insertNoteSchema.partial();

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData: RegisterUser = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await User.findOne({ email: validatedData.email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      // Hash password
      const hashedPassword = await hashPassword(validatedData.password);
      
      // Create user
      const user = await User.create({
        ...validatedData,
        password: hashedPassword,
      });

      // Generate token
      const token = generateToken(user._id.toString());
      
      res.status(201).json({
        message: 'User created successfully',
        user,
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid user data', errors: error.errors });
      } else {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Failed to create user' });
      }
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const validatedData: LoginUser = loginSchema.parse(req.body);
      
      // Find user
      const user = await User.findOne({ email: validatedData.email }).select('+password');
      if (!user) {
        return res.status(404).json({ 
          message: 'USER_NOT_EXISTS',
          displayMessage: 'You are a new one ehh try to register first Mr/Ms Task haver'
        });
      }

      // Check password
      const isValidPassword = await comparePassword(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ 
          message: 'WRONG_CREDENTIALS',
          displayMessage: 'Wrong!!! we know you are not new but come on now khekhe'
        });
      }

      // Generate token
      const token = generateToken(user._id.toString());
      
      res.json({
        message: 'Login successful',
        user: user.toJSON(), // This will exclude password
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid login data', errors: error.errors });
      } else {
        console.error('Error logging in:', error);
        res.status(500).json({ message: 'Failed to login' });
      }
    }
  });

  app.get('/api/auth/user', authenticateToken, async (req: AuthRequest, res) => {
    try {
      res.json(req.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Notes routes
  app.get("/api/notes", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!._id.toString();
      const { search, priority } = req.query;
      
      let notesResult;
      if (search) {
        notesResult = await storage.searchUserNotes(userId, search as string);
      } else if (priority && priority !== 'all') {
        notesResult = await storage.filterUserNotesByPriority(userId, parseInt(priority as string));
      } else {
        notesResult = await storage.getUserNotes(userId);
      }
      
      res.json(notesResult);
    } catch (error) {
      console.error("Error fetching notes:", error);
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  app.post("/api/notes", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!._id.toString();
      const validatedData = insertNoteSchema.parse(req.body);
      
      const newNote = await storage.createNote(userId, validatedData);
      res.status(201).json(newNote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid note data", errors: error.errors });
      } else {
        console.error("Error creating note:", error);
        res.status(500).json({ message: "Failed to create note" });
      }
    }
  });

  app.put("/api/notes/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!._id.toString();
      const noteId = req.params.id;
      const validatedData = updateNoteSchema.parse(req.body);
      
      const updatedNote = await storage.updateNote(noteId, userId, validatedData);
      if (!updatedNote) {
        return res.status(404).json({ message: "Note not found" });
      }
      
      res.json(updatedNote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid note data", errors: error.errors });
      } else {
        console.error("Error updating note:", error);
        res.status(500).json({ message: "Failed to update note" });
      }
    }
  });

  app.delete("/api/notes/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!._id.toString();
      const noteId = req.params.id;
      
      const deleted = await storage.deleteNote(noteId, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Note not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting note:", error);
      res.status(500).json({ message: "Failed to delete note" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
