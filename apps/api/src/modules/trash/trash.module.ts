import { Module } from '@nestjs/common'
import { TrashController } from './trash.controller'
import { TrashService } from './trash.service'

// La Papelera no importa ningún módulo: los adaptadores de cada uno se anotan solos en el TrashRegistry (global).
// Exporta su service para Escuela (borrar una materia = mandar su proyecto a la papelera) y para las tareas
// programadas (los 30 días).
@Module({
  controllers: [TrashController],
  providers: [TrashService],
  exports: [TrashService],
})
export class TrashModule {}
