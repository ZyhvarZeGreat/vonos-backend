import {
  BadRequestException,
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { PublicTrackService } from './public-track.service';

/** Public vehicle tracker — VA + VP only, no JWT, no financials. */
@Controller('public/track')
export class PublicTrackController {
  constructor(private readonly track: PublicTrackService) {}

  @Get()
  lookup(
    @Query('name') name?: string,
    @Query('registration') registration?: string,
    @Query('reg') reg?: string,
  ) {
    const customerName = name?.trim() ?? '';
    const plate = (registration ?? reg)?.trim() ?? '';
    if (!customerName || !plate) {
      throw new BadRequestException(
        'name and registration (plate) are required',
      );
    }
    return this.track.lookup({ name: customerName, registration: plate });
  }
}
