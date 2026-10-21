import { Module } from '@nestjs/common'
import { StorageService } from './storage.service'

// No es @Global() (a diferencia de DbModule/SupabaseModule): solo Proyectos y Attachments la usan
// hoy, así que cada uno la importa explícitamente (igual que ProjectsModule con TasksModule).
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
