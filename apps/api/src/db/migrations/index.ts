export type Migration = {
    id: string;
    sql: string;
};

export const migrations: Migration[] = [
    {
        id: "001_init",
        sql: `
            CREATE TABLE IF NOT EXISTS users (
                id uuid PRIMARY KEY,
                email text NOT NULL,
                password_hash text NOT NULL,
                created_at timestamptz NOT NULL DEFAULT now()
            );

            CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx
                ON users (lower(email));

            CREATE TABLE IF NOT EXISTS documents (
                id uuid PRIMARY KEY,
                user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                kind text NOT NULL CHECK (kind IN ('upload', 'merge', 'split', 'organize')),
                original_name text NOT NULL,
                s3_key text NOT NULL,
                size_bytes bigint NOT NULL,
                page_count integer,
                status text NOT NULL DEFAULT 'temp' CHECK (status IN ('temp', 'ready')),
                operation jsonb,
                created_at timestamptz NOT NULL DEFAULT now(),
                expires_at timestamptz
            );

            CREATE INDEX IF NOT EXISTS documents_user_created_idx
                ON documents (user_id, created_at DESC);

            CREATE INDEX IF NOT EXISTS documents_status_idx
                ON documents (status);
        `,
    },
];
