"use server";

import { auth, signIn, signOut } from "../../auth";
import { AuthError } from "next-auth";
import { db } from "@vercel/postgres";
import bcrypt from "bcrypt";

export async function authenticate(
  _prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "電子留守、または暗号鍵が間違っているようだ。"; // エラーメッセージも三島風に
        default:
          return "門の開扉に失敗した。";
      }
    }
    throw error;
  }
}

export async function register(
  _prevState: string | undefined,
  formData: FormData,
) {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password || password.length < 6) {
      return "電子留守、または暗号鍵の要件を満たしていない（鍵は6文字以上必要）。";
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const client = await db.connect();
    
    // ユーザーが既に存在するか確認
    const existingUser = await client.sql`SELECT * FROM users WHERE email=${email}`;
    if (existingUser.rows.length > 0) {
      client.release();
      return "その電子留守は既に何者かによって登録されている。";
    }

    const name = (formData.get("name") as string) || email.split("@")[0];

    await client.sql`
      INSERT INTO users (name, email, password)
      VALUES (${name}, ${email}, ${hashedPassword})
    `;
    client.release();

    // 登録成功後、自動的にログイン
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "登録後の自動開扉に失敗した。";
        default:
          return "門の開扉に失敗した。";
      }
    }
    throw error;
  }
}

export async function logout() {
  await signOut();
}

export async function getConversations() {
  try {
    const session = await auth();
    if (!session?.user?.email) return [];

    const client = await db.connect();
    
    const userResult = await client.sql`SELECT id FROM users WHERE email=${session.user.email}`;
    if (userResult.rows.length === 0) {
      client.release();
      return [];
    }
    const userId = userResult.rows[0].id;

    const convResult = await client.sql`
      SELECT id, title, created_at FROM conversations 
      WHERE user_id=${userId} 
      ORDER BY created_at DESC
    `;
    
    client.release();
    
    return convResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      createdAt: row.created_at
    }));
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    return [];
  }
}

export async function createConversation(title: string) {
  try {
    const session = await auth();
    if (!session?.user?.email) return null;

    const client = await db.connect();
    
    const userResult = await client.sql`SELECT id FROM users WHERE email=${session.user.email}`;
    if (userResult.rows.length === 0) {
      client.release();
      return null;
    }
    const userId = userResult.rows[0].id;

    const insertResult = await client.sql`
      INSERT INTO conversations (user_id, title)
      VALUES (${userId}, ${title})
      RETURNING id
    `;
    
    client.release();
    
    return insertResult.rows[0].id;
  } catch (error) {
    console.error("Failed to create conversation:", error);
    return null;
  }
}

export async function getChatHistory(conversationId: string | null = null) {
  try {
    const session = await auth();
    if (!session?.user?.email) return [];

    const client = await db.connect();
    
    // ユーザーの取得
    const userResult = await client.sql`SELECT id FROM users WHERE email=${session.user.email}`;
    if (userResult.rows.length === 0) {
      client.release();
      return [];
    }
    const userId = userResult.rows[0].id;

    // メッセージの取得 (古い順)
    let messagesResult;
    if (conversationId) {
      messagesResult = await client.sql`
        SELECT role, content FROM messages 
        WHERE user_id=${userId} AND conversation_id=${conversationId}
        ORDER BY created_at ASC
      `;
    } else {
      messagesResult = await client.sql`
        SELECT role, content FROM messages 
        WHERE user_id=${userId} AND conversation_id IS NULL
        ORDER BY created_at ASC
      `;
    }
    
    client.release();
    
    return messagesResult.rows.map(row => ({
      role: row.role as "user" | "mishima",
      content: row.content as string
    }));
  } catch (error) {
    console.error("Failed to fetch chat history:", error);
    return [];
  }
}
