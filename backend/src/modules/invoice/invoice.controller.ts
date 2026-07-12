import InvoiceService from '@services/invoice';
import { NextFunction, Request, Response } from 'express';
import { Respond } from '@utils/respond';
import { InvoiceExportQueryValidationResult, InvoiceListQueryValidationResult } from './invoice.validator';

async function list(req: Request, res: Response, next: NextFunction) {
	try {
		const { page, limit, invoiceType, status, search, from, to } = req.locals.data as InvoiceListQueryValidationResult;
		const result = await InvoiceService.list(req.locals.user!, { invoiceType, status, search, from, to }, { page, limit });

		return Respond({ res, status: 200, data: result });
	} catch (error) {
		return next(error);
	}
}

async function getById(req: Request, res: Response, next: NextFunction) {
	try {
		const invoice = await InvoiceService.getById(req.locals.id!, req.locals.user!);
		return Respond({ res, status: 200, data: invoice });
	} catch (error) {
		return next(error);
	}
}

async function download(req: Request, res: Response, next: NextFunction) {
	try {
		const { buffer, filename } = await InvoiceService.downloadPdf(req.locals.id!, req.locals.user!);

		res.setHeader('Content-Type', 'application/pdf');
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
		return res.status(200).send(buffer);
	} catch (error) {
		return next(error);
	}
}

async function resend(req: Request, res: Response, next: NextFunction) {
	try {
		const invoice = await InvoiceService.resend(req.locals.id!);
		return Respond({ res, status: 200, data: invoice });
	} catch (error) {
		return next(error);
	}
}

async function exportInvoices(req: Request, res: Response, next: NextFunction) {
	try {
		const { page, limit, format, ...filters } = req.locals.data as InvoiceExportQueryValidationResult;
		const { buffer, filename, contentType } = await InvoiceService.exportList(req.locals.user!, filters, format);

		res.setHeader('Content-Type', contentType);
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
		return res.status(200).send(buffer);
	} catch (error) {
		return next(error);
	}
}

const Controller = {
	list,
	getById,
	download,
	resend,
	exportInvoices,
};

export default Controller;
