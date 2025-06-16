import { Model } from 'objection';

interface Verification {
  id: string;
  user_id: string;
  captcha_code: string;
  verified: boolean;
  created_at: Date;
  verified_at: Date | null;
}

class Verification extends Model implements Verification {
  static tableName = 'verification';

  static idColumn = 'id';

  static jsonSchema = {
    type: 'object',
    required: ['user_id', 'captcha_code'],
    properties: {
      id: { type: 'string' },
      user_id: { type: 'string' },
      captcha_code: { type: 'string' },
      verified: { type: 'boolean', default: false },
      created_at: { type: 'string', format: 'date-time' },
      verified_at: { type: ['string', 'null'], format: 'date-time' }
    }
  };

  $beforeInsert() {
    this.created_at = new Date();
  }

  $beforeUpdate() {
    if (this.verified && !this.verified_at) {
      this.verified_at = new Date();
    }
  }
}

export default Verification; 