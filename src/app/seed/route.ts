import { db } from "@vercel/postgres";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

export async function GET() {
  const client = await db.connect();

  try {
    await client.sql`BEGIN`;

    // UUIDを自動生成するための拡張機能を有効化
    await client.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

    // usersテーブルの作成
    await client.sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
    `;

    // conversationsテーブルの作成
    await client.sql`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // messagesテーブルの作成
    await client.sql`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 既存の messages テーブルに対する互換性
    await client.sql`
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;
    `;

    // パスワードを暗号化（ハッシュ化）してテストユーザーを作成
    // ※今回はパスワードを「123456」で設定します
    const hashedPassword = await bcrypt.hash("mishima1970", 10);
    await client.sql`
      INSERT INTO users (name, email, password)
      VALUES ('生者（テスト）', 'user@nextmail.com', ${hashedPassword})
      ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password;
    `;

    await client.sql`COMMIT`;
    return NextResponse.json({
      message: "データベースの構築（シード）に成功しました！",
    });
  } catch (error) {
    await client.sql`ROLLBACK`;
    console.error(error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    client.release();
  }
}
