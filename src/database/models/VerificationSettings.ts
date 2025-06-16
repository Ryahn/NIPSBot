import { Model } from 'objection';

interface VerificationSettings {
  id: string;
  guild_id: string;
  log_channel_id: string | null;
  verification_timeout: number;
  reminder_time: number;
  created_at: Date;
  updated_at: Date;
}

class VerificationSettings extends Model implements VerificationSettings {
  static tableName = 'verification_settings';

  static idColumn = 'id';

  static jsonSchema = {
    type: 'object',
    required: ['guild_id'],
    properties: {
      id: { type: 'string' },
      guild_id: { type: 'string' },
      log_channel_id: { type: ['string', 'null'] },
      verification_timeout: { type: 'integer', minimum: 60 }, // Minimum 1 minute
      reminder_time: { type: 'integer', minimum: 30 }, // Minimum 30 seconds
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' }
    }
  };
}

export default VerificationSettings; 