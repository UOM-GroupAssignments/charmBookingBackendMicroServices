import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEncrptionFields1771178360405 implements MigrationInterface {
    name = 'AddEncrptionFields1771178360405'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`salon_details\` DROP COLUMN \`owner_nic\``);
        await queryRunner.query(`ALTER TABLE \`salon_details\` ADD \`owner_nic\` varchar(512) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`salon_details\` DROP COLUMN \`bank_account_full_name\``);
        await queryRunner.query(`ALTER TABLE \`salon_details\` ADD \`bank_account_full_name\` varchar(512) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`salon_details\` DROP COLUMN \`bank_account_number\``);
        await queryRunner.query(`ALTER TABLE \`salon_details\` ADD \`bank_account_number\` varchar(512) NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`salon_details\` DROP COLUMN \`bank_account_number\``);
        await queryRunner.query(`ALTER TABLE \`salon_details\` ADD \`bank_account_number\` varchar(20) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`salon_details\` DROP COLUMN \`bank_account_full_name\``);
        await queryRunner.query(`ALTER TABLE \`salon_details\` ADD \`bank_account_full_name\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`salon_details\` DROP COLUMN \`owner_nic\``);
        await queryRunner.query(`ALTER TABLE \`salon_details\` ADD \`owner_nic\` varchar(12) NOT NULL`);
    }

}
