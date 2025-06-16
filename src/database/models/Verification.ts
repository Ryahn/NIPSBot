import { Model } from 'objection';

interface Verification {
  id: string;
  user_id: string;
  captcha_code: string;
  verified: boolean;
  created_at: Date;
  verified_at?: Date;
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
      verified: { type: 'boolean' },
      created_at: { type: 'string', format: 'date-time' },
      verified_at: { type: ['string', 'null'], format: 'date-time' }
    }
  };
}

export default Verification; 