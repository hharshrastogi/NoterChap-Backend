import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertNoteSchema } from "@shared/schema";
import { z } from "zod";

const updateNoteSchema = insertNoteSchema.partial();

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Notes routes
  app.get("/api/notes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.post("/api/notes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.put("/api/notes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.delete("/api/notes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
