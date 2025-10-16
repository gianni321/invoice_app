const BaseModel = require('./BaseModel');
const bcrypt = require('bcryptjs');

class User extends BaseModel {
  static get tableName() {
    return 'users';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        id: { type: 'integer' },
        email: { 
          type: 'string', 
          format: 'email',
          maxLength: 255 
        },
        password: { 
          type: 'string', 
          minLength: 8,
          maxLength: 255 
        },
        name: { 
          type: ['string', 'null'], 
          maxLength: 255 
        },
        role: {
          type: 'string',
          enum: ['user', 'admin'],
          default: 'user'
        },
        is_active: {
          type: 'boolean',
          default: true
        },
        last_login: {
          type: ['string', 'null'],
          format: 'date-time'
        },
        email_verified: {
          type: 'boolean',
          default: false
        },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    const Entry = require('./Entry');
    const Invoice = require('./Invoice');

    return {
      entries: {
        relation: BaseModel.HasManyRelation,
        modelClass: Entry,
        join: {
          from: 'users.id',
          to: 'entries.user_id'
        }
      },
      invoices: {
        relation: BaseModel.HasManyRelation,
        modelClass: Invoice,
        join: {
          from: 'users.id',
          to: 'invoices.user_id'
        }
      }
    };
  }

  // Hash password before insert/update
  async $beforeInsert(queryContext) {
    await super.$beforeInsert(queryContext);
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  async $beforeUpdate(opt, queryContext) {
    await super.$beforeUpdate(opt, queryContext);
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  // Remove password from JSON output
  $formatJson(json) {
    json = super.$formatJson(json);
    delete json.password;
    return json;
  }

  // Instance methods
  async verifyPassword(password) {
    if (!this.password) return false;
    return bcrypt.compare(password, this.password);
  }

  async updateLastLogin() {
    return this.$query().patch({
      last_login: new Date().toISOString()
    });
  }

  // Static methods
  static async findByEmail(email) {
    return this.query()
      .where('email', email.toLowerCase())
      .first();
  }

  static async createUser(userData) {
    return this.query().insert({
      ...userData,
      email: userData.email.toLowerCase()
    });
  }

  static async findActiveUsers() {
    return this.query()
      .where('is_active', true);
  }

  static async findAdmins() {
    return this.query()
      .where('role', 'admin')
      .where('is_active', true);
  }

  // Validation methods
  static async emailExists(email, excludeId = null) {
    const query = this.query().where('email', email.toLowerCase());
    
    if (excludeId) {
      query.whereNot('id', excludeId);
    }
    
    const user = await query.first();
    return !!user;
  }
}

module.exports = User;