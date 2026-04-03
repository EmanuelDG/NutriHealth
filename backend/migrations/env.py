from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
import sys

# Import models
from database.database import Base
import database.models

# Alembic configuration
config = context.config

# Set database URL
import os
from dotenv import load_dotenv
load_dotenv()
database_url = os.getenv("DATABASE_URL")

# PostgreSQL is not properly configured
if not database_url:
    print("ERROR: PostgreSQL database connection not configured correctly.")
    print("Please set DATABASE_URL in your .env file to a valid PostgreSQL connection string.")
    print("Example: DATABASE_URL=postgresql://username:password@localhost/dbname")
    sys.exit(1)

config.set_main_option("sqlalchemy.url", database_url)

# Configure logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set metadata target for migrations
target_metadata = Base.metadata

# run migrations in offline mode
def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

# run migrations in online mode
def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            render_as_batch=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
