import { Controller, Get, Inject, Query } from '@nestjs/common'
import { type SearchQuery, searchQuerySchema } from '@kairo/shared'
import { CurrentUser } from '../../auth/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { SearchService } from './search.service'

// Ctrl+K (Atajos.dc.html).
@Controller('search')
export class SearchController {
  // @Inject() explícito: mismo motivo que en tasks.controller.ts.
  constructor(@Inject(SearchService) private readonly searchService: SearchService) {}

  @Get()
  search(@CurrentUser() userId: string, @Query(new ZodValidationPipe(searchQuerySchema)) query: SearchQuery) {
    return this.searchService.search(userId, query.q)
  }
}
