# MCP Server Configuration for PureMycelium

This directory contains the Model Context Protocol (MCP) server configuration for connecting GitHub Copilot to your Supabase database.

## Setup Instructions

### 1. Get Your Database Password

You need your Supabase database password to connect. If you don't have it:

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/acxhhfwvxtkvxkvmfiep)
2. Navigate to **Settings** → **Database**
3. Find or reset your database password

### 2. Configure VS Code Settings

Add the MCP server configuration to your VS Code settings:

**Option A: User Settings (Recommended)**

1. Open VS Code Settings (Ctrl+Comma or Cmd+Comma)
2. Click the "Open Settings (JSON)" icon in the top-right
3. Add the following configuration:

```json
{
  "github.copilot.chat.mcp.enabled": true,
  "github.copilot.chat.mcpServers": {
    "puremycelium-postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres:YOUR_DATABASE_PASSWORD@db.acxhhfwvxtkvxkvmfiep.supabase.co:5432/postgres"
      ]
    }
  }
}
```

**Option B: Workspace Settings**

1. Create `.vscode/settings.json` in your project root
2. Add the same configuration as above

### 3. Replace Database Password

In the configuration above, replace `YOUR_DATABASE_PASSWORD` with your actual Supabase database password.

### 4. Restart VS Code

After updating settings, restart VS Code to activate the MCP server.

## Using the MCP Server

Once configured, you can interact with your Supabase database through GitHub Copilot Chat:

### Example Queries

- "Show me all tables in the database"
- "What's the schema of the products table?"
- "Query all customers from the database"
- "Show me recent orders with their status"
- "Explain the relationship between orders and customers tables"

### Available Commands

The PostgreSQL MCP server provides these capabilities:

- **Query Database** - Execute SELECT queries to retrieve data
- **List Tables** - View all tables in your database
- **Describe Schema** - Get table structures and relationships
- **View Data** - Browse table contents

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit database credentials** to version control
2. Use environment variables for sensitive data in production
3. The `.env` file is already in `.gitignore` (keep it that way)
4. Consider using connection pooling for production workloads
5. Restrict database user permissions appropriately

## Troubleshooting

### MCP Server Not Working?

1. **Check VS Code version** - Ensure you're using a recent version that supports MCP
2. **Verify Copilot Chat is enabled** - Make sure GitHub Copilot Chat extension is installed
3. **Check connection string** - Ensure the database password is correct
4. **Review VS Code Output** - Check the Output panel (View → Output) for errors
5. **Restart VS Code** - Sometimes a full restart is needed

### Connection Issues?

- Verify your Supabase project is active
- Check that your IP is allowed in Supabase Network settings
- Test connection using a PostgreSQL client first
- Ensure the database password hasn't been changed

## Alternative: Direct PostgreSQL Connection

If you prefer to use a standard PostgreSQL client:

```bash
psql "postgresql://postgres:YOUR_PASSWORD@db.acxhhfwvxtkvxkvmfiep.supabase.co:5432/postgres"
```

## Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [Supabase Documentation](https://supabase.com/docs)
- [GitHub Copilot MCP Guide](https://docs.github.com/en/copilot/using-github-copilot/using-mcp-in-github-copilot)
