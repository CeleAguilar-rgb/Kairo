import { Module } from '@nestjs/common'
import { SearchController } from './search.controller.js'
import { SearchService } from './search.service.js'

// Igual que la Papelera: no importa ningún módulo; cada uno se anota en el SearchRegistry (global).
@Module({
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
