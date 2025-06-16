import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('alliance_members', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.string('tag').notNullable();
    table.string('role_name').notNullable();
    table.string('role_id').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['name', 'tag']);
    table.index(['role_id']);
    table.index(['role_name']);

    table.unique(['name', 'tag']);
    table.unique(['role_id']);
    table.unique(['role_name']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('alliance_members');
} 