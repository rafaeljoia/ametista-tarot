/**
 * CLI para criar (ou redefinir senha de) um administrador.
 *
 * Uso:
 *   ADMIN_EMAIL=admin@dominio.com ADMIN_PASSWORD=senha123 ADMIN_NAME="Admin" \
 *     npm run --prefix backend seed:admin
 *
 * Idempotente: se o e-mail já existir, atualiza a senha + nome.
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Admin } from '../database/entities/admin.entity';
import { User } from '../database/entities/user.entity';
import { Consultant } from '../database/entities/consultant.entity';
import { Credit } from '../database/entities/credit.entity';
import { Consultation } from '../database/entities/consultation.entity';
import { Message } from '../database/entities/message.entity';
import { ConsultantEarning } from '../database/entities/consultant-earning.entity';
import { Transaction } from '../database/entities/transaction.entity';
import { ConsultantAvailabilityAlert } from '../database/entities/consultant-availability-alert.entity';
import { Review } from '../database/entities/review.entity';
import { CommissionPayout } from '../database/entities/commission-payout.entity';

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Administrador';

  if (!email || !password || password.length < 8) {
    console.error(
      'Defina ADMIN_EMAIL, ADMIN_PASSWORD (mín. 8 chars) e opcionalmente ADMIN_NAME.',
    );
    process.exit(1);
  }

  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'ametista',
    password: process.env.DB_PASSWORD || 'ametista123',
    database: process.env.DB_NAME || 'ametista_tarot',
    entities: [
      Admin,
      User,
      Consultant,
      Credit,
      Consultation,
      Message,
      ConsultantEarning,
      Transaction,
      ConsultantAvailabilityAlert,
      Review,
      CommissionPayout,
    ],
    synchronize: false,
  });

  await ds.initialize();
  const repo = ds.getRepository(Admin);
  const existing = await repo.findOne({ where: { email } });
  const hash = await bcrypt.hash(password, 10);

  if (existing) {
    existing.password = hash;
    existing.name = name;
    existing.isActive = true;
    await repo.save(existing);
    console.log(`✔ Admin atualizado: ${email}`);
  } else {
    await repo.save(repo.create({ email, password: hash, name, isActive: true }));
    console.log(`✔ Admin criado: ${email}`);
  }

  await ds.destroy();
}

main().catch((err) => {
  console.error('Erro ao seed admin:', err);
  process.exit(1);
});
