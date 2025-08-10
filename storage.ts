import {
  users,
  notes,
  type User,
  type UpsertUser,
  type Note,
  type InsertNote,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ilike } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Note operations
  getUserNotes(userId: string): Promise<Note[]>;
  createNote(userId: string, note: InsertNote): Promise<Note>;
  updateNote(noteId: string, userId: string, note: Partial<InsertNote>): Promise<Note | undefined>;
  deleteNote(noteId: string, userId: string): Promise<boolean>;
  searchUserNotes(userId: string, query: string): Promise<Note[]>;
  filterUserNotesByPriority(userId: string, priority: number): Promise<Note[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Note operations
  async getUserNotes(userId: string): Promise<Note[]> {
    return await db
      .select()
      .from(notes)
      .where(eq(notes.userId, userId))
      .orderBy(desc(notes.createdAt));
  }

  async createNote(userId: string, note: InsertNote): Promise<Note> {
    const [newNote] = await db
      .insert(notes)
      .values({ ...note, userId })
      .returning();
    return newNote;
  }

  async updateNote(noteId: string, userId: string, note: Partial<InsertNote>): Promise<Note | undefined> {
    const [updatedNote] = await db
      .update(notes)
      .set({ ...note, updatedAt: new Date() })
      .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
      .returning();
    return updatedNote;
  }

  async deleteNote(noteId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(notes)
      .where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
    return result.rowCount > 0;
  }

  async searchUserNotes(userId: string, query: string): Promise<Note[]> {
    return await db
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.userId, userId),
          or(
            ilike(notes.title, `%${query}%`),
            ilike(notes.description, `%${query}%`)
          )
        )
      )
      .orderBy(desc(notes.createdAt));
  }

  async filterUserNotesByPriority(userId: string, priority: number): Promise<Note[]> {
    return await db
      .select()
      .from(notes)
      .where(and(eq(notes.userId, userId), eq(notes.priority, priority)))
      .orderBy(desc(notes.createdAt));
  }
}

export const storage = new DatabaseStorage();
