import {
  Booking,
  BookingStatus,
  ConfigService,
  GenericError,
  PayHereNotifyDTO,
  PayHerePayload,
  PaymentDetails,
  PaymentStatus,
} from '@charmbooking/common';
import { HttpService } from '@nestjs/axios';
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { BookingService } from 'src/booking/booking.service';
import {
  PayHereOAuthResponse,
  PayHereRefundResponse,
} from 'src/dto/paymentDto';
import { Repository } from 'typeorm';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class PayHereService {
  constructor(
    private bookingService: BookingService,
    @InjectRepository(PaymentDetails)
    private paymentDetailsRepository: Repository<PaymentDetails>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  generateMd5Hash(input: string): string {
    return crypto.createHash('md5').update(input).digest('hex').toUpperCase();
  }

  generateCheckoutHash({
    merchantId,
    orderId,
    amount,
    currency,
    merchantSecret,
  }: {
    merchantId: string;
    orderId: string;
    amount: string;
    currency: string;
    merchantSecret: string;
  }) {
    const amountFormated = parseFloat(amount)
      .toLocaleString('en-us', { minimumFractionDigits: 2 })
      .replaceAll(',', '');
    const secretMd5 = this.generateMd5Hash(merchantSecret);
    const raw = merchantId + orderId + amountFormated + currency + secretMd5;
    return this.generateMd5Hash(raw);
  }

  async buildCheckoutPayload({
    bookingId,
    address1,
    address2,
    city,
  }: {
    bookingId: string;
    address1: string;
    address2: string;
    city: string;
  }): Promise<PayHerePayload> {
    const booking = await this.bookingService.findById(bookingId);
    if (!booking)
      throw new GenericError('Booking not found', HttpStatus.NOT_FOUND);
    const orderId = `${booking.id}:${Date.now()}`;
    const notifyURL = `${this.configService.payHere.backendUrl}/payments/notify`;
    const user = booking.user;
    const merchantId = this.configService.payHere.merchantId;
    const merchantSecret = this.configService.payHere.merchantSecret;
    if (!merchantId || !merchantSecret) {
      throw new GenericError(
        'Payment configuration is missing',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    // Generate the hash
    const hash = this.generateCheckoutHash({
      merchantId,
      orderId,
      amount: booking.amount.toString(),
      currency: 'LKR',
      merchantSecret,
    });
    console.log({
      sandbox: false,
      merchant_id: merchantId,
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email,
      phone: user.phone,
      address: [address1, address2].filter(Boolean).join(', '),
      city,
      country: 'LK',
      order_id: orderId,
      items: booking.salonService.name,
      currency: 'LKR',
      amount: booking.amount,
      notify_url: notifyURL,
      hash,
    });
    return {
      sandbox: false,
      merchant_id: merchantId,
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email,
      phone: user.phone,
      address: [address1, address2].filter(Boolean).join(', '),
      city,
      country: 'LK',
      order_id: orderId,
      items: booking.salonService.name,
      currency: 'LKR',
      amount: booking.amount,
      notify_url: notifyURL,
      hash,
    };
  }

  async handlePaymentNotification(body: PayHereNotifyDTO) {
    // Extract POST params
    const {
      merchant_id,
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      method,
    } = body;

    const merchantSecret = this.configService.payHere.merchantSecret;
    if (!merchantSecret) {
      throw new GenericError(
        'Merchant secret is missing',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const localMd5Sig = this.generateMd5Hash(
      merchant_id +
        order_id +
        payhere_amount +
        payhere_currency +
        status_code +
        this.generateMd5Hash(merchantSecret),
    );
    console.log('Computed MD5:', localMd5Sig, 'Received MD5:', md5sig);
    if (localMd5Sig !== md5sig) {
      throw new GenericError('Invalid signature', HttpStatus.BAD_REQUEST);
    }

    const bookingId = order_id.split(':')[0];
    console.log('Processing payment for booking ID:', bookingId);
    const booking = await this.bookingService.findById(bookingId);
    const existingPayment = await this.paymentDetailsRepository.findOne({
      where: { id: payment_id },
    });
    if (existingPayment) {
      console.warn(`Payment ${payment_id} already processed!`);
      return;
    }

    // Verify payment status with PayHere API
    const isValidPayment = await this.verifyPaymentWithPayHere(payment_id);
    if (!isValidPayment) {
      throw new GenericError(
        'Payment verification failed',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!booking) throw new Error('Booking not found');
    let paymentStatus: PaymentStatus;
    switch (status_code) {
      case '2':
        booking.status = BookingStatus.CONFIRMED;
        paymentStatus = PaymentStatus.PAID;
        break;
      case '0':
        booking.status = BookingStatus.PENDING;
        paymentStatus = PaymentStatus.PENDING;
        break;
      case '-1':
        booking.status = BookingStatus.CANCELLED;
        paymentStatus = PaymentStatus.CANCELLED;
        break;
      case '-2':
        booking.status = BookingStatus.CANCELLED;
        paymentStatus = PaymentStatus.FAILED;
        break;
      default:
        paymentStatus = PaymentStatus.FAILED;
        booking.status = BookingStatus.CANCELLED;
    }

    const paymentDetails: Partial<PaymentDetails> = {
      id: payment_id,
      amount: Number(payhere_amount),
      status: paymentStatus,
      paid_at: new Date(),
      payment_method: method,
    };

    // Save payment details
    const payment = this.paymentDetailsRepository.create(paymentDetails);
    await this.paymentDetailsRepository.save(payment);

    // Update booking with payment details
    booking.payment_id = payment_id;
    booking.status = BookingStatus.CONFIRMED;
    await this.bookingService.update(booking.id, booking);
  }
  private async verifyPaymentWithPayHere(paymentId: string): Promise<boolean> {
    const accessToken = await this.getPayHereAccessToken();
    const url = `https://api.payhere.lk/merchant/v1/payments/${paymentId}`;
    try {
      const response = await lastValueFrom(
        this.httpService.get(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );
      return response.data.status_code === '2';
    } catch (err) {
      console.error('Error verifying payment with PayHere', err);
      return false;
    }
  }

  async refundBooking(bookingId: string, reason?: string) {
    const booking = await this.validateBookingForRefund(bookingId);
    const accessToken = await this.getPayHereAccessToken();
    return await this.processRefund(booking, accessToken, reason);
  }

  private async validateBookingForRefund(bookingId: string) {
    const booking = await this.bookingService.findById(bookingId);

    if (!booking || !booking.payment_id) {
      throw new GenericError('Booking not found', HttpStatus.NOT_FOUND);
    }

    return booking;
  }

  private async getPayHereAccessToken(): Promise<string> {
    const { appId, appSecret } = this.validatePaymentConfiguration();
    const oauthURL = 'https://sandbox.payhere.lk/merchant/v1/oauth/token';

    try {
      const response = await lastValueFrom(
        this.httpService.post<PayHereOAuthResponse>(
          oauthURL,
          { grantType: 'client_credentials' },
          {
            headers: {
              Authorization: `Basic ${Buffer.from(`${appId}:${appSecret}`).toString('base64')}`,
            },
          },
        ),
      );

      return response.data.access_token;
    } catch {
      throw new GenericError(
        'Failed to obtain access token',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private validatePaymentConfiguration() {
    const appId = this.configService.payHere.appId;
    const appSecret = this.configService.payHere.appSecret;

    if (!appId || !appSecret) {
      throw new GenericError(
        'Payment configuration is missing',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return { appId, appSecret };
  }

  private async processRefund(
    booking: Booking,
    accessToken: string,
    reason?: string,
  ) {
    const refundURL = 'https://sandbox.payhere.lk/merchant/v1/payment/refund';

    try {
      const refundResponse = await lastValueFrom(
        this.httpService.post<PayHereRefundResponse>(
          refundURL,
          {
            paymentId: booking.payment_id,
            reason,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        ),
      );

      return this.handleRefundResponse(refundResponse.data, booking);
    } catch {
      throw new GenericError(
        'Failed to process refund',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async handleRefundResponse(
    refundData: PayHereRefundResponse,
    booking: Booking,
  ) {
    switch (refundData.status) {
      case 1:
        // Refund successful
        await this.updateBookingAfterRefund(booking);
        return { status: 'success' };
      case 0:
        throw new GenericError(
          'Error initiating refund',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      case -1:
        throw new GenericError(
          `Refund Failed: ${refundData.msg}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      default:
        throw new GenericError(
          'Unknown refund status',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }
  }

  private async updateBookingAfterRefund(booking: Booking) {
    booking.status = BookingStatus.CANCELLED;
    await this.bookingService.update(booking.id, booking);
    await this.paymentDetailsRepository.update(booking.payment_id!, {
      status: PaymentStatus.REFUNDED,
    });
  }
}
