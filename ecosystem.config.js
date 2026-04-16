module.exports = {
  apps: [{
    name: 'devx-omni-pro',
    script: 'server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      MONGODB_URI: 'mongodb+srv://mrdev:dev091339@cluster0.grjlq7v.mongodb.net/devx_omni?retryWrites=true&w=majority',
      AI_API_URL: 'https://api.dev-x.com/v1/chat/completions',
      AI_API_KEY: 'devx-k9v41ybg64exej9lkkovg5dof00ep3yr'
    }
  }]
};
