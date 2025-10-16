const { Model } = require('objection');

class BaseModel extends Model {
  // Common functionality for all models
  
  $beforeInsert() {
    this.created_at = new Date().toISOString();
    this.updated_at = new Date().toISOString();
  }

  $beforeUpdate() {
    this.updated_at = new Date().toISOString();
  }

  // Format timestamps for consistent output
  $formatJson(json) {
    json = super.$formatJson(json);
    
    // Format dates
    if (json.created_at) {
      json.createdAt = json.created_at;
      delete json.created_at;
    }
    
    if (json.updated_at) {
      json.updatedAt = json.updated_at;
      delete json.updated_at;
    }

    return json;
  }

  // Common query helpers
  static findById(id) {
    return this.query().findById(id);
  }

  static findByIdAndUser(id, userId) {
    return this.query()
      .findById(id)
      .where('user_id', userId);
  }

  static findByUser(userId) {
    return this.query()
      .where('user_id', userId);
  }

  // Soft delete functionality
  static get softDelete() {
    return false; // Override in models that need soft delete
  }

  $beforeDelete() {
    if (this.constructor.softDelete) {
      this.deleted_at = new Date().toISOString();
      return this.$query().patch({ deleted_at: this.deleted_at });
    }
  }
}

module.exports = BaseModel;