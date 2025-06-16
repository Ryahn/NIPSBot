import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('verification_settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('guild_id').notNullable();
    table.string('log_channel_id').nullable();
    table.integer('verification_timeout').defaultTo(300); // 5 minutes in seconds
    table.integer('reminder_time').defaultTo(60); // 1 minute before expiry
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Ensure one settings per guild
    table.unique(['guild_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('verification_settings');
} 