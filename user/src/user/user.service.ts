import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from 'src/dto/createUserDTO';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import {
  CreateReviewDto,
  LoginUserResponseDTO,
  UpdatePasswordDto,
  UserDetailsDTO,
} from 'src/dto/userDTO';
import { LoginUserDto } from 'src/dto/userDTO';
import {
  Booking,
  GenericError,
  User,
  UserRole,
  SalonReview,
  BookingStatus,
} from '@charmbooking/common';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(SalonReview)
    private salonReviewRepository: Repository<SalonReview>,
  ) {}

  async getUserById(userId: string): Promise<UserDetailsDTO> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new GenericError('User not found', HttpStatus.NOT_FOUND);
    }
    // Map only the fields you want to expose
    const userDetails: UserDetailsDTO = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      dateOfBirth: user.dateOfBirth?.toISOString().split('T')[0],
      phone: user.phone,
    };
    return userDetails;
  }

  async updateUserById(
    userId: string,
    updateUserDto: Partial<UserDetailsDTO>,
  ): Promise<UserDetailsDTO> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new GenericError('User not found', HttpStatus.NOT_FOUND);
    }

    // Update only provided fields
    if (updateUserDto.firstName !== undefined)
      user.firstName = updateUserDto.firstName;
    if (updateUserDto.lastName !== undefined)
      user.lastName = updateUserDto.lastName;
    if (updateUserDto.email !== undefined) user.email = updateUserDto.email;
    if (updateUserDto.dateOfBirth !== undefined)
      user.dateOfBirth = new Date(updateUserDto.dateOfBirth);
    if (updateUserDto.phone !== undefined) user.phone = updateUserDto.phone;

    const savedUser = await this.userRepository.save(user);

    // Return updated user details
    return {
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      email: savedUser.email,
      dateOfBirth: savedUser.dateOfBirth?.toISOString().split('T')[0],
      phone: savedUser.phone,
    };
  }

  async updateUserPassword(
    userId: string,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new GenericError('User not found', HttpStatus.NOT_FOUND);
    }
    const isOldPasswordValid = await bcrypt.compare(
      updatePasswordDto.oldPassword,
      user.password,
    );
    if (!isOldPasswordValid) {
      throw new GenericError(
        'Old password is incorrect',
        HttpStatus.BAD_REQUEST,
      );
    }
    user.password = await bcrypt.hash(updatePasswordDto.newPassword, 10);
    await this.userRepository.save(user);
  }

  //-----------------------Register a new user
  async register(createUserDto: CreateUserDto): Promise<User> {
    if (
      !createUserDto.email ||
      !createUserDto.password ||
      !createUserDto.firstName ||
      !createUserDto.lastName ||
      !createUserDto.dateOfBirth
    ) {
      throw new GenericError('All fields are required', HttpStatus.BAD_REQUEST);
    }
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existingUser) {
      throw new GenericError(
        'User with this email already exists',
        HttpStatus.BAD_REQUEST,
      );
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    // Create a new user instance
    const newUser = this.userRepository.create({
      ...createUserDto,
      dateOfBirth: createUserDto.dateOfBirth
        ? new Date(createUserDto.dateOfBirth)
        : undefined,
      password: hashedPassword,
    });
    return this.userRepository.save(newUser);
  }

  //-----------------------User logging
  async login(loginUserDto: LoginUserDto): Promise<LoginUserResponseDTO> {
    const { email, password } = loginUserDto;
    if (!email || !password) {
      throw new GenericError(
        'Email and password are required',
        HttpStatus.BAD_REQUEST,
      );
    }
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new GenericError('User not found', HttpStatus.NOT_FOUND);
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new GenericError('Invalid Credentials', HttpStatus.UNAUTHORIZED);
    }
    const token = this.jwtService.sign({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: UserRole.Customer,
    });
    await this.userRepository.save(user);
    return {
      customerId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      token,
    };
  }

  async getUserBookingsById(userId: string): Promise<any> {
    const bookings = await this.bookingRepository.find({
      where: {
        user_id: userId,
        //booking_date: In([new Date().toISOString().split('T')[0]]),
      },
      relations: ['salonService', 'salon'],
    });
    if (!bookings || bookings.length === 0) {
      throw new GenericError(
        'No bookings found for this user',
        HttpStatus.NOT_FOUND,
      );
    }
    return bookings.map((booking) => ({
      id: booking.id,
      user_id: booking.user_id,
      salon_id: booking.salon_id,
      salon_service_id: booking.salon_service_id,
      amount: booking.amount,
      payment_id: booking.payment_id,
      worker_id: booking.worker_id,
      date: booking.booking_date,
      time: booking.start_time,
      duration: booking.salonService?.duration || null,
      status: booking.status,
      created_at: booking.created_at,
      serviceName: booking.salonService?.name || null,
      salonName: booking.salon?.name || null,
    }));
  }

  async addReviewToBooking(
    userId: string,
    bookingId: string,
    reviewDto: CreateReviewDto,
  ): Promise<SalonReview> {
    const booking = await this.bookingRepository.findOne({
      where: {
        id: bookingId,
        user_id: userId,
        status: BookingStatus.COMPLETED,
      },
    });
    if (!booking) {
      throw new GenericError(
        'Booking not found or you do not have permission to review it',
        HttpStatus.NOT_FOUND,
      );
    }

    const review = this.salonReviewRepository.create({
      ...reviewDto,
      userId: userId,
      bookingId: booking.id,
    });
    return this.salonReviewRepository.save(review);
  }
}
