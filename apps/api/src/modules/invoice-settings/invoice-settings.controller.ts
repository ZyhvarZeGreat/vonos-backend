import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  JwtAuthGuard,
  RolesGuard,
  TenantGuard,
} from '../../common/guards/auth.guards';
import { Roles } from '../../common/decorators/roles.decorator';
import type {
  CreateInvoiceSchemeInput,
  CreateReceiptPrinterInput,
  UpdateInvoiceSchemeInput,
  UpdateInvoiceSettingsInput,
  UpdateReceiptPrinterInput,
} from '@vonos/types';
import { InvoiceSettingsService } from './invoice-settings.service';

@Controller('invoice-settings')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class InvoiceSettingsController {
  constructor(private readonly service: InvoiceSettingsService) {}

  @Get()
  getSettings() {
    return this.service.getSettings();
  }

  @Patch()
  @Roles('admin', 'manager')
  updateSettings(@Body() body: UpdateInvoiceSettingsInput) {
    return this.service.updateSettings(body);
  }

  @Post('schemes')
  @Roles('admin', 'manager')
  createScheme(@Body() body: CreateInvoiceSchemeInput) {
    return this.service.createScheme(body);
  }

  @Patch('schemes/:id')
  @Roles('admin', 'manager')
  updateScheme(@Param('id') id: string, @Body() body: UpdateInvoiceSchemeInput) {
    return this.service.updateScheme(id, body);
  }

  @Delete('schemes/:id')
  @Roles('admin', 'manager')
  deleteScheme(@Param('id') id: string) {
    return this.service.deleteScheme(id);
  }

  @Get('printers')
  listPrinters() {
    return this.service.listPrinters();
  }

  @Post('printers')
  @Roles('admin', 'manager')
  createPrinter(@Body() body: CreateReceiptPrinterInput) {
    return this.service.createPrinter(body);
  }

  @Patch('printers/:id')
  @Roles('admin', 'manager')
  updatePrinter(@Param('id') id: string, @Body() body: UpdateReceiptPrinterInput) {
    return this.service.updatePrinter(id, body);
  }

  @Delete('printers/:id')
  @Roles('admin', 'manager')
  deletePrinter(@Param('id') id: string) {
    return this.service.deletePrinter(id);
  }
}
