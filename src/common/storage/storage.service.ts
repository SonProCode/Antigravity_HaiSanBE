import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService implements OnModuleInit {
    private supabase: SupabaseClient;
    private bucket: string;

    constructor(private configService: ConfigService) { }

    onModuleInit() {
        const url = this.configService.get<string>('SUPABASE_URL');
        const key = this.configService.get<string>('SUPABASE_KEY');
        this.bucket = this.configService.get<string>('SUPABASE_BUCKET', 'thson_webhaisan');

        if (!url || !key) {
            console.warn('Supabase credentials missing. Image uploads will fail.');
            return;
        }

        this.supabase = createClient(url, key);
    }

    async uploadFile(file: Express.Multer.File, folder = 'products'): Promise<string> {
        if (!this.supabase) {
            throw new Error('Supabase client not initialized');
        }

        const fileExt = file.originalname.split('.').pop();
        const fileName = `${folder}/${uuidv4()}.${fileExt}`;

        const { data, error } = await this.supabase.storage
            .from(this.bucket)
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: false,
            });

        if (error) {
            throw new Error(`Upload failed: ${error.message}`);
        }

        const { data: urlData } = this.supabase.storage
            .from(this.bucket)
            .getPublicUrl(fileName);

        return urlData.publicUrl;
    }
}
