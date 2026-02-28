export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string;
          content: string;
          embedding: number[];
          metadata: Json | null;
        };
        Insert: {
          id?: string;           // optional on insert
          content: string;
          embedding: number[];
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          content?: string;
          embedding?: number[];
          metadata?: Json | null;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
