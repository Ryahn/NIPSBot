import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('user_alliances', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('user_id').notNullable();
    table.uuid('alliance_id').notNullable().references('id').inTable('alliance_members').onDelete('CASCADE');
    table.string('original_nickname').nullable();
    table.timestamp('joined_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Ensure a user can only be in an alliance once
    table.unique(['user_id', 'alliance_id']);

    table.index(['user_id', 'alliance_id']);
    table.index(['original_nickname']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('user_alliances');
} 