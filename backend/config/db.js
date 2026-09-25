const { checkSupabaseConnection } = require('./supabase');

const connectDB = async () => {
  await checkSupabaseConnection();
};

module.exports = connectDB;

