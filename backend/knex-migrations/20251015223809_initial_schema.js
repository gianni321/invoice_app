/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Create users table
    .createTable('users', (table) => {
      table.increments('id').primary();
      table.string('email', 255).notNullable().unique();
      table.string('password', 255).notNullable();
      table.string('name', 255);
      table.enu('role', ['user', 'admin']).defaultTo('user');
      table.boolean('is_active').defaultTo(true);
      table.datetime('last_login');
      table.boolean('email_verified').defaultTo(false);
      table.timestamps(true, true);
      
      // Indexes
      table.index(['email']);
      table.index(['role']);
      table.index(['is_active']);
    })
    
    // Create entries table
    .createTable('entries', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.text('description').notNullable();
      table.decimal('hours', 8, 2).notNullable();
      table.string('project', 255);
      table.decimal('rate', 10, 2);
      table.date('date').notNullable();
      table.enu('status', ['open', 'invoiced', 'paid']).defaultTo('open');
      table.integer('invoice_id').unsigned();
      table.string('tags', 500);
      table.text('notes');
      table.timestamps(true, true);
      
      // Foreign keys
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      
      // Indexes
      table.index(['user_id']);
      table.index(['status']);
      table.index(['date']);
      table.index(['project']);
      table.index(['invoice_id']);
    })
    
    // Create invoices table
    .createTable('invoices', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('invoice_number', 50).notNullable();
      table.string('client_name', 255).notNullable();
      table.string('client_email', 255);
      table.text('client_address');
      table.decimal('total_amount', 12, 2).notNullable();
      table.string('currency', 3).defaultTo('USD');
      table.enu('status', ['draft', 'sent', 'paid', 'overdue', 'cancelled']).defaultTo('draft');
      table.date('issue_date').notNullable();
      table.date('due_date');
      table.date('paid_date');
      table.string('payment_method', 100);
      table.text('notes');
      table.decimal('tax_rate', 5, 2);
      table.decimal('tax_amount', 12, 2);
      table.decimal('subtotal', 12, 2);
      table.string('file_path', 500);
      table.timestamps(true, true);
      
      // Foreign keys
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      
      // Indexes
      table.index(['user_id']);
      table.index(['status']);
      table.index(['issue_date']);
      table.index(['due_date']);
      table.index(['client_name']);
      table.unique(['user_id', 'invoice_number']);
    })
    
    // Create settings table for app configuration
    .createTable('settings', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned();
      table.string('key', 100).notNullable();
      table.text('value');
      table.string('type', 50).defaultTo('string'); // string, number, boolean, json
      table.boolean('is_global').defaultTo(false);
      table.timestamps(true, true);
      
      // Foreign keys
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      
      // Indexes
      table.index(['user_id']);
      table.index(['key']);
      table.index(['is_global']);
      table.unique(['user_id', 'key']);
    })
    
    // Create audit log table
    .createTable('audit_logs', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned();
      table.string('action', 100).notNullable();
      table.string('resource_type', 50).notNullable();
      table.integer('resource_id').unsigned();
      table.json('old_values');
      table.json('new_values');
      table.string('ip_address', 45);
      table.string('user_agent', 500);
      table.string('correlation_id', 36);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Foreign keys
      table.foreign('user_id').references('id').inTable('users').onDelete('SET NULL');
      
      // Indexes
      table.index(['user_id']);
      table.index(['action']);
      table.index(['resource_type']);
      table.index(['created_at']);
      table.index(['correlation_id']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('audit_logs')
    .dropTableIfExists('settings')
    .dropTableIfExists('entries')
    .dropTableIfExists('invoices')
    .dropTableIfExists('users');
};
