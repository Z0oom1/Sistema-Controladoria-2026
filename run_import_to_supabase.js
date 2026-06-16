const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = "https://abmjqotikqfailjvylhu.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFibWpxb3Rpa3FmYWlsanZ5bGh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MDQyMTMsImV4cCI6MjA5NzE4MDIxM30.g7cXuTRhgs9wu-sHJiJGnUGL8zxEbNxHt37oTCngwOI";
const supabase = createClient(supabaseUrl, supabaseKey);

// Interceptar fs.existsSync para database.sqlite
const originalExistsSync = fs.existsSync;
fs.existsSync = function (filePath) {
  if (filePath && filePath.endsWith('database.sqlite')) {
    return true;
  }
  return originalExistsSync.apply(this, arguments);
};

// Interceptar require('sqlite3')
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function (id) {
  if (id === 'sqlite3') {
    return {
      verbose: () => ({
        Database: function () {
          return {
            get: (sql, callback) => {
              console.log("Mock SQLite: Carregando produtos atuais do Supabase...");
              supabase
                .from('app_data')
                .select('value')
                .eq('key', 'aw_products')
                .maybeSingle()
                .then(({ data, error }) => {
                  if (error) {
                    callback(error, null);
                  } else {
                    callback(null, data ? { value: JSON.stringify(data.value) } : null);
                  }
                })
                .catch(err => callback(err, null));
            },
            run: (sql, params, callback) => {
              console.log("Mock SQLite: Salvando produtos atualizados no Supabase...");
              try {
                const key = params[0];
                const value = JSON.parse(params[1]);

                supabase
                  .from('app_data')
                  .upsert({ key, value })
                  .then(({ error }) => {
                    if (error) {
                      callback(error);
                    } else {
                      callback(null);
                    }
                  })
                  .catch(err => callback(err));
              } catch (err) {
                callback(err);
              }
            },
            close: () => {
              console.log("Mock SQLite: Finalizado.");
            }
          };
        }
      })
    };
  }
  return originalRequire.apply(this, arguments);
};

// Executa o script original
console.log("Iniciando importação redirecionada para o Supabase...");
require('./server/corrigir_importacao.js');
