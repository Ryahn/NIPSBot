import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('verification_settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('guild_id').notNullable();
    table.string('log_channel_id').nullable();
    table.string('verified_role_id').nullable();
    table.integer('verification_timeout').notNullable().defaultTo(300);
    table.integer('reminder_time').notNullable().defaultTo(60);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Ensure each guild has only one settings record
    table.unique(['guild_id']);
    
    // Add indexes for common queries
    table.index(['guild_id']);
    table.index(['log_channel_id']);
    table.index(['verified_role_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('verification_settings');
} 