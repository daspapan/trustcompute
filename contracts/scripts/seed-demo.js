const hre = require("hardhat");

async function main() {
  const signers = await hre.ethers.getSigners();
  // Locally Account #2 is the seller; on a testnet only the deployer key is configured.
  const seller = signers[2] || signers[0];
  const deployment = require(`../deployments/${hre.network.name}.json`);
  const jobs = require("../../backend/data/demo-jobs.json");

  const escrow = await hre.ethers.getContractAt("EscrowMarketplace", deployment.address, seller);

  for (const job of jobs) {
    const canonical = `${job.title}\n${job.task}\n${job.expected}`;
    const specHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(canonical));
    const tx = await escrow.listVoucher(job.jobId, hre.ethers.parseEther(job.price), specHash);
    await tx.wait();
    console.log(`Listed job #${job.jobId} "${job.title}" at ${job.price} ETH`);
    console.log(`  spec ${specHash}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
