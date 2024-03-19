const fs = require('fs');
import {OpenAI} from 'openai';
import {NextResponse} from 'next/server';
require('dotenv').config();
const pinataSDK = require('@pinata/sdk');
const path = require('path');



export async function POST(req) {
    if (req.method !== 'POST') {
        return NextResponse.json({error: "Method not allowed"}, {status: 405});
    }

    try {
        //initialize OpenAI
        const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});

        //Generate original Image
        const image = await openai.images.generate({
            model: 'dall-e-2', 
            prompt: 'Cartoon dog with his family', 
            response_format: 'b64_json',
            size: '256x256',
            n:1
          });


        //write original image to server
        const buffer = Buffer.from(image.data[0].b64_json, 'base64');
        fs.writeFileSync(`./og.png`, buffer);
        const filePath = path.join(process.cwd(), 'og.png');

        //create variation of first image
        const image2 = await openai.images.createVariation({
            image: fs.createReadStream(filePath),
            model: 'dall-e-2',  
            response_format: 'b64_json',
            size: '256x256',
            n:1
          });



        //write remixed image to server
        const buf2 = Buffer.from(image2.data[0].b64_json, 'base64');
        fs.writeFileSync(`./change1.png`, buf2);

        //connect to Pinata
        const pinata = new pinataSDK({pinataApiKey: process.env.PINATA_KEY, pinataSecretApiKey: process.env.PINATA_SECRET});
        const res = await pinata.testAuthentication();
        console.log(res);

        //Upload image 1
        const options = {
            pinataMetadata: {
                name: "OG",
                keyvalues: {
                    customKey: 'og',
                    customKey2: 'ogg'
                }
            },
            pinataOptions: {
                cidVersion: 0
            }
        };

        const fileStream = fs.createReadStream(filePath);
        const respo = await pinata.pinFileToIPFS(fileStream, options);
        const uris = []
        uris.push('https://cloudflare-ipfs.com/ipfs/' + respo.IpfsHash);



        //Upload Image 2
        const filePath2 = path.join(process.cwd(), 'change1.png');
        const options2 = {
            pinataMetadata: {
                name: "change1",
                keyvalues: {
                    customKey: 'c1',
                    customKey2: 'c11'
                }
            },
            pinataOptions: {
                cidVersion: 0
            }
        };


        
        const fileStream2 = fs.createReadStream(filePath2);
        const respo2 = await pinata.pinFileToIPFS(fileStream2, options2);
        uris.push('https://cloudflare-ipfs.com/ipfs/' + respo2.IpfsHash);
      

        console.log(uris);
        //respond with URIs of the images on IPFS
        return NextResponse.json({data: uris}, {status:200});
        

    } catch(e) {
        console.error("Error making variations:", e);
        return NextResponse.json({error: "Error creating variations"}, {status:500});
    }
}