const fs = require('fs');
import {OpenAI} from 'openai';
import {NextResponse} from 'next/server';


export async function POST(req) {
    
    if (req.method !== "POST") {
        return NextResponse.json({ error: "Method not allowed" },{status:405});
    }

    try {
        //connect to Open AI
        const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});

        //generate Image based on prompt
        const image = await openai.images.generate({
            model: 'dall-e-2', 
            prompt: 'Cartoon frog eating ice cream', 
            response_format: 'b64_json',
            size: '256x256'
          });

        //write file from base 64 to server
        const buffer = Buffer.from(image.data[0].b64_json, 'base64');
        fs.writeFileSync(`./image_nft.png`, buffer);
          
        
        return NextResponse.json({ b64: image.data[0].b64_json }, {status:200});

    } catch (error) {
        console.error("Error generating image:", error);
        return NextResponse.json({ error: "Error generating image" }, {status:500});
    };
}
