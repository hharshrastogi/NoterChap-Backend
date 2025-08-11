import {
  User,
  Note,
  type IUser,
  type INote,
  type UpsertUser,
  type InsertNote,
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<IUser | undefined>;
  upsertUser(user: UpsertUser): Promise<IUser>;
  
  // Note operations
  getUserNotes(userId: string): Promise<INote[]>;
  createNote(userId: string, note: InsertNote): Promise<INote>;
  updateNote(noteId: string, userId: string, note: Partial<InsertNote>): Promise<INote | undefined>;
  deleteNote(noteId: string, userId: string): Promise<boolean>;
  searchUserNotes(userId: string, query: string): Promise<INote[]>;
  filterUserNotesByPriority(userId: string, priority: number): Promise<INote[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<IUser | undefined> {
    try {
      const user = await User.findById(id);
      return user || undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async upsertUser(userData: UpsertUser): Promise<IUser> {
    try {
      // If user has an _id, try to update, otherwise create
      if (userData._id) {
        const user = await User.findByIdAndUpdate(
          userData._id,
          { ...userData, updatedAt: new Date() },
          { new: true, upsert: true }
        );
        return user!;
      } else {
        const user = await User.create(userData);
        return user;
      }
    } catch (error) {
      console.error('Error upserting user:', error);
      throw error;
    }
  }

  // Note operations
  async getUserNotes(userId: string): Promise<INote[]> {
    try {
      return await Note.find({ userId }).sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting user notes:', error);
      throw error;
    }
  }

  async createNote(userId: string, note: InsertNote): Promise<INote> {
    try {
      const newNote = await Note.create({ ...note, userId });
      return newNote;
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  }

  async updateNote(noteId: string, userId: string, note: Partial<InsertNote>): Promise<INote | undefined> {
    try {
      const updatedNote = await Note.findOneAndUpdate(
        { _id: noteId, userId },
        { ...note, updatedAt: new Date() },
        { new: true }
      );
      return updatedNote || undefined;
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  }

  async deleteNote(noteId: string, userId: string): Promise<boolean> {
    try {
      const result = await Note.findOneAndDelete({ _id: noteId, userId });
      return !!result;
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  }

  async searchUserNotes(userId: string, query: string): Promise<INote[]> {
    try {
      return await Note.find({
        userId,
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } }
        ]
      }).sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error searching notes:', error);
      throw error;
    }
  }

  async filterUserNotesByPriority(userId: string, priority: number): Promise<INote[]> {
    try {
      return await Note.find({ userId, priority }).sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error filtering notes by priority:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
