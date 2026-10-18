import { Module } from '@nestjs/common'
import { AccountController } from './account.controller'
import { AccountRepository } from './account.repository'
import { AccountService } from './account.service'

@Module({
  controllers: [AccountController],
  providers: [AccountService, AccountRepository],
  // Recordatorios necesita getMe() para la zona horaria del perfil (modules.md:
  // un módulo pide datos al service de otro, nunca lee su tabla).
  exports: [AccountService],
})
export class AccountModule {}
