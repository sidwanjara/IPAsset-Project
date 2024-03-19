'use client'
import { sepolia } from "viem/chains";
import 'viem/window';
import { Address, JsonRpcAccount, PublicClient, WalletClient, createPublicClient, createWalletClient, custom } from "viem";
import { abi2 } from "../../abi";
import { useState } from "react";
import swal from 'sweetalert';
import { http } from "viem";
import {RegisterPILPolicyRequest, StoryClient, StoryConfig} from '@story-protocol/core-sdk';
import { Fragment } from "react";
import Head from "next/head";


export default function Home() {
  //states
  const [addy, setAddy] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [tokenId, setTokenId] = useState('');
  

  //handles wallet connection
  async function connectWallet() {
    const accounts =  await window.ethereum!.request({method: 'eth_requestAccounts'});
    setAddy(accounts[0]);
    setIsConnected(true);
  } 

  //delay helper
  function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  //transaction helper
  async function secondTrans(client : WalletClient, pubClient : PublicClient, derivURI : String) {
    const {result, request} = await pubClient.simulateContract({
          address: '0xb4a4520BdEBE0690812eF0812EBAea648334365A',
          abi: abi2,
          functionName: 'mint',
          args:[addy, derivURI],
          account:addy as Address
    });
    const one = BigInt(1)
    const derivID = String(result + one);

    const hash = client.writeContract(request);
    console.log("Second Hash " + hash)
    return derivID;
    
  }


  //Optional Bonus (Remix NFT)
  async function createVar() {
    if (!isConnected) {
      swal("Sorry", "Must Connect Wallet First", "error");
    } else {

      try {
        //calls create VAR API, responds with two URI's for NFTs
        const resp = await fetch('/api/createVar', {
          method: "POST",
        });

        const ressy = await resp.json();
        console.log(ressy.data);

        const ogURI = ressy.data[0];
        const derivURI = ressy.data[1];

       //Viem Client setup
        const client = createWalletClient({
          account: addy as Address,
          chain: sepolia,
          transport: custom(window.ethereum!)
        });
        const pubC = createPublicClient({
          chain:sepolia,
          transport: http()
        });


        //Mint original NFT
        
        const {result, request} = await pubC.simulateContract({
          address: '0xb4a4520BdEBE0690812eF0812EBAea648334365A',
          abi: abi2,
          functionName: 'mint',
          args:[addy, ogURI],
          account:addy as Address
        });

        const ogID = String(result)
        console.log("OG token ID" + ogID);
        const hash1 = client.writeContract(request);
       
        await delay(10000);
        
        //MINT SECOND NFT
      
        const derivID = await secondTrans(client, pubC, derivURI);
        await delay(10000);
        console.log("Deriv token ID: " + derivID);



        //Story config setup
        const acct: JsonRpcAccount = {
          address: addy as Address,
          type: 'json-rpc'
        }
        const config: StoryConfig = {
          account: acct,
          chainId: '11155111',
          transport: custom(window.ethereum!),
        };
  
        //register original NFT as IP asset
  
        const storcli = StoryClient.newClient(config);
        const responseStory = await storcli.ipAsset.registerRootIp({
          tokenContractAddress: '0xb4a4520BdEBE0690812eF0812EBAea648334365A' as Address,
          tokenId: tokenId,
          txOptions: {waitForTransaction:true}
        });

        await delay(10000);
        console.log(`Root IPA created at transaction hash ${responseStory.txHash}, IPA ID: ${responseStory.ipId}`);
        






        //create Policy on Story
        const RemixParams : RegisterPILPolicyRequest= {
          attribution: false, // Whether or not attribution is required when reproducing the work
          commercialUse: true, // Whether or not the work can be used commercially
          derivativesAttribution: false, // Whether or not attribution is required for derivatives of the work
          derivativesAllowed: true, // Whether or not the licensee can create derivatives of the work
          derivativesApproval: false, // Whether or not the licensor must approve derivatives of the work before they can be
          derivativesReciprocal: false, // Whether or not the licensee must license derivatives of the work under the same terms
          transferable: true
        };

      
        
        const respPolicyCreate = await storcli.policy.registerPILPolicy({
          ...RemixParams,
          txOptions: {waitForTransaction:true}
        });
        console.log(`PIL Policy registered at transaction hash ${respPolicyCreate.txHash}, Policy ID: ${respPolicyCreate.policyId}`)
        const policyID = String(respPolicyCreate.policyId);

        await delay(10000);




        //attach policy on Story

        const attachPolicyResponse = await storcli.policy.addPolicyToIp({
          policyId: policyID,
          ipId : responseStory.ipId as Address,
          txOptions: {waitForTransaction: true}
        });
        console.log(`Attached Policy to IP at transaction hash ${attachPolicyResponse.txHash}, index: ${attachPolicyResponse.index}`);
        await delay(10000);




        //Create Derivative Asset on Story
        const resDeriv = await storcli.ipAsset.registerDerivativeIp({
          tokenContractAddress: '0xb4a4520BdEBE0690812eF0812EBAea648334365A',
          tokenId: derivID,
          licenseIds: [policyID],
          txOptions: {waitForTransaction:true}
        });

        console.log(`Remixed IPA created at transaction hash ${resDeriv.txHash}, IPA ID: ${resDeriv.ipId}`);



        
        swal('Congrats', 'You Minted and Registered an NFT as IP on Story Protocol and Remixed it! View your NFTs here! (May take up to a minute to load): https://testnets.opensea.io/assets/sepolia/0xb4a4520bdebe0690812ef0812ebaea648334365a/' + ogID + "    https://testnets.opensea.io/assets/sepolia/0xb4a4520bdebe0690812ef0812ebaea648334365a/" + derivID);

      


      } catch (e) {
        console.log(e);
      }
    }
  }



  async function generateAndUpload() {

    if (!isConnected) {
      swal("Sorry", "Must Connect Wallet First", "error");
    } else {

    
    //generate image
      try {
        const response1 = await fetch('/api/generate', {
          method: "POST",
        });

        const result1 = await response1.json();
        console.log(result1);
      } catch (e) {
        console.log(e);
      }
    
    //upload image
    try {
        

      const response2 = await fetch('/api/upload', {
        method: 'POST',
      });
      
      const res2 = await response2.json();
      console.log(res2);
      const uri2 = 'https://cloudflare-ipfs.com/ipfs/' + res2.data.IpfsHash;
      
      console.log(uri2);

      //Viem Client setup
      const client = createWalletClient({
        account: addy as Address,
        chain: sepolia,
        transport: custom(window.ethereum!)
      });
      const pubC = createPublicClient({
        chain:sepolia,
        transport: http()
      });


      //Mint NFT
      const {result, request} = await pubC.simulateContract({
        address: '0xb4a4520BdEBE0690812eF0812EBAea648334365A',
        abi: abi2,
        functionName: 'mint',
        args:[addy, uri2],
        account:addy as Address
      });

      
      setTokenId(String(result));
      console.log(String(result));
      console.log("Post Sim");

      
      const hash = await client.writeContract(request);

      await delay(6000);

      console.log(hash);
      console.log("Post write");


    } catch(e) {
      console.log(e);
    }
    //Register as IP asset
    
    try {
      //Story Config setup
      const acct: JsonRpcAccount = {
        address: addy as Address,
        type: 'json-rpc'
      }
      const config: StoryConfig = {
        account: acct,
        chainId: '11155111',
        transport: custom(window.ethereum!),
      };

      //Setup client and register as IP asset
      const storcli = StoryClient.newClient(config);
      const responseStory = await storcli.ipAsset.registerRootIp({
        tokenContractAddress: '0xb4a4520BdEBE0690812eF0812EBAea648334365A' as Address,
        tokenId: tokenId,
        txOptions: {waitForTransaction:true}
      });

      console.log(`Root IPA created at transaction hash ${responseStory.txHash}, IPA ID: ${responseStory.ipId}`);
      
      swal('Congrats', 'You Minted and Registered an NFT as IP on Story Protocol! View your NFT here! (May take up to a minute to load): https://testnets.opensea.io/assets/sepolia/0xb4a4520bdebe0690812ef0812ebaea648334365a/' + tokenId);
    
    
    } catch (e) {
      console.log(e);
    }

    
    
    }
  }
  
  
  return (
  //frontend UI
  <Fragment>
      <Head>
        <title>Story SWE Intern Assessment</title>
      </Head>

      <div>
        {/* Navigation */}
        <nav className="fixed w-full z-10 top-0 text-white body-font bg-opacity-50 bg-gray-900 backdrop-filter backdrop-blur-lg">
          <div className="container mx-auto flex flex-wrap p-5 flex-col md:flex-row items-center justify-between">
            <a href="#mint-and-register" className="title-font font-medium text-white mb-4 md:mb-0 cursor-pointer">
              Story SWE Intern Assessment
            </a>
            <div className="md:ml-auto flex flex-wrap items-center text-base justify-center">
              <a href="#mint-and-register" className="mr-5 hover:text-gray-400 cursor-pointer">Mint and Register</a>
              <a href="#create-comic" className="mr-5 hover:text-gray-400 cursor-pointer">Create Variations</a>
              <a target="_blank" href="https://www.alchemy.com/faucets/ethereum-sepolia" className="mr-5 hover:text-gray-400 cursor-pointer">Sepolia Faucet</a>
            </div>
          </div>
        </nav>

        {/* Mint and Register Section */}
        <section id="mint-and-register" className="text-white body-font min-h-screen flex items-center justify-center" style={{background: 'linear-gradient(to right, #000000, #32105D)', paddingTop: '100px'}}>
          <div className="container mx-auto flex flex-col items-center p-24 bg-black rounded-lg shadow-lg">
            Mint and Register!
            {!isConnected ? (
              <button onClick={connectWallet} className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full">
                Connect Wallet!
              </button>
            ) : (
              <div className="mt-4 text-white font-bold py-2">
                Wallet Address: {addy}
              </div>
            )}
            <button onClick={generateAndUpload} className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full">
              Mint and Register NFT as IP on Story!
            </button>
          </div>
        </section>

        {/* Create Var Section */}
        <section id="create-comic" className="text-white body-font min-h-screen flex items-center justify-center" style={{background: 'linear-gradient(to right, #000000, #32105D)', paddingTop: '100px'}}>
          <div className="container mx-auto flex flex-col items-center p-24 bg-black rounded-lg shadow-lg">
            Create Variations!
            {!isConnected ? (
              <button onClick={connectWallet} className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full">
                Connect Wallet!
              </button>
            ) : (
              <div className="mt-4 text-white font-bold py-2">
                Wallet Address: {addy}
              </div>
            )}
            <button onClick={createVar} className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full">
              Create Variations and register as IP derivatives!
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-white body-font">
          <div className="container mx-auto flex items-center justify-center flex-col">
            <p className="text-sm text-gray-400 sm:ml-4 sm:pl-4 sm:py-2 sm:mt-0 mt-4">
              © {new Date().getFullYear()} Your DApp Name —
              <a href="https://twitter.com/SidWanjara" className="text-gray-500 ml-1" target="_blank" rel="noopener noreferrer">
                @SidWanjara
              </a>
            </p>
          </div>
        </footer>
      </div>
    </Fragment>
  );
  



}
