pragma solidity 0.8.28;

// ---- vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/contracts/lib/Constants.sol ----
// SPDX-License-Identifier: Apache-2.0



library Constants {
  uint256 constant SNARK_SCALAR_FIELD =
    21_888_242_871_839_275_222_246_405_745_257_275_088_548_364_400_416_034_343_698_204_186_575_808_495_617;

  address constant NATIVE_ASSET = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
}

// ---- node_modules/poseidon-solidity/PoseidonT4.sol ----
library PoseidonT4 {
  uint constant F = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

  uint constant M00 = 0x236d13393ef85cc48a351dd786dd7a1de5e39942296127fd87947223ae5108ad;
  uint constant M01 = 0x2a75a171563b807db525be259699ab28fe9bc7fb1f70943ff049bc970e841a0c;
  uint constant M02 = 0x2070679e798782ef592a52ca9cef820d497ad2eecbaa7e42f366b3e521c4ed42;
  uint constant M03 = 0x2f545e578202c9732488540e41f783b68ff0613fd79375f8ba8b3d30958e7677;
  uint constant M10 = 0x277686494f7644bbc4a9b194e10724eb967f1dc58718e59e3cedc821b2a7ae19;
  uint constant M11 = 0x083abff5e10051f078e2827d092e1ae808b4dd3e15ccc3706f38ce4157b6770e;
  uint constant M12 = 0x2e18c8570d20bf5df800739a53da75d906ece318cd224ab6b3a2be979e2d7eab;
  uint constant M13 = 0x23810bf82877fc19bff7eefeae3faf4bb8104c32ba4cd701596a15623d01476e;
  uint constant M20 = 0x023db68784e3f0cc0b85618826a9b3505129c16479973b0a84a4529e66b09c62;
  uint constant M21 = 0x1a5ad71bbbecd8a97dc49cfdbae303ad24d5c4741eab8b7568a9ff8253a1eb6f;
  uint constant M22 = 0x0fa86f0f27e4d3dd7f3367ce86f684f1f2e4386d3e5b9f38fa283c6aa723b608;
  uint constant M23 = 0x014fcd5eb0be6d5beeafc4944034cf321c068ef930f10be2207ed58d2a34cdd6;
  uint constant M30 = 0x1d359d245f286c12d50d663bae733f978af08cdbd63017c57b3a75646ff382c1;
  uint constant M31 = 0x0d745fd00dd167fb86772133640f02ce945004a7bc2c59e8790f725c5d84f0af;
  uint constant M32 = 0x03f3e6fab791f16628168e4b14dbaeb657035ee3da6b2ca83f0c2491e0b403eb;
  uint constant M33 = 0x00c15fc3a1d5733dd835eae0823e377f8ba4a8b627627cc2bb661c25d20fb52a;

  // See here for a simplified implementation: https://github.com/vimwitch/poseidon-solidity/blob/e57becdabb65d99fdc586fe1e1e09e7108202d53/contracts/Poseidon.sol#L40
  // Inspired by: https://github.com/iden3/circomlibjs/blob/v0.0.8/src/poseidon_slow.js
  function hash(uint[3] memory) public pure returns (uint) {
    assembly {
      // memory 0x00 to 0x3f (64 bytes) is scratch space for hash algos
      // we can use it in inline assembly because we're not calling e.g. keccak
      //
      // memory 0x80 is the default offset for free memory
      // we take inputs as a memory argument so we simply write over
      // that memory after loading it

      // we have the following variables at memory offsets
      // state0 - 0x00
      // state1 - 0x20
      // state2 - 0x80
      // state3 - 0xa0
      // state4 - ...

      function pRound(c0, c1, c2, c3) {
        let state0 := add(mload(0x0), c0)
        let state1 := add(mload(0x20), c1)
        let state2 := add(mload(0x80), c2)
        let state3 := add(mload(0xa0), c3)

        let p := mulmod(state0, state0, F)
        state0 := mulmod(mulmod(p, p, F), state0, F)

        mstore(0x0, mod(add(add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)), mulmod(state3, M30, F)), F))
        mstore(0x20, mod(add(add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)), mulmod(state3, M31, F)), F))
        mstore(0x80, mod(add(add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)), mulmod(state3, M32, F)), F))
        mstore(0xa0, mod(add(add(add(mulmod(state0, M03, F), mulmod(state1, M13, F)), mulmod(state2, M23, F)), mulmod(state3, M33, F)), F))
      }

      function fRound(c0, c1, c2, c3) {
        let state0 := add(mload(0x0), c0)
        let state1 := add(mload(0x20), c1)
        let state2 := add(mload(0x80), c2)
        let state3 := add(mload(0xa0), c3)

        let p := mulmod(state0, state0, F)
        state0 := mulmod(mulmod(p, p, F), state0, F)
        p := mulmod(state1, state1, F)
        state1 := mulmod(mulmod(p, p, F), state1, F)
        p := mulmod(state2, state2, F)
        state2 := mulmod(mulmod(p, p, F), state2, F)
        p := mulmod(state3, state3, F)
        state3 := mulmod(mulmod(p, p, F), state3, F)

        mstore(0x0, mod(add(add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)), mulmod(state3, M30, F)), F))
        mstore(0x20, mod(add(add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)), mulmod(state3, M31, F)), F))
        mstore(0x80, mod(add(add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)), mulmod(state3, M32, F)), F))
        mstore(0xa0, mod(add(add(add(mulmod(state0, M03, F), mulmod(state1, M13, F)), mulmod(state2, M23, F)), mulmod(state3, M33, F)), F))
      }

      // scratch variable for exponentiation
      let p

      {
        // load the inputs from memory
        let state1 := add(mod(mload(0x80), F), 0x265ddfe127dd51bd7239347b758f0a1320eb2cc7450acc1dad47f80c8dcf34d6)
        let state2 := add(mod(mload(0xa0), F), 0x199750ec472f1809e0f66a545e1e51624108ac845015c2aa3dfc36bab497d8aa)
        let state3 := add(mod(mload(0xc0), F), 0x157ff3fe65ac7208110f06a5f74302b14d743ea25067f0ffd032f787c7f1cdf8)

        p := mulmod(state1, state1, F)
        state1 := mulmod(mulmod(p, p, F), state1, F)
        p := mulmod(state2, state2, F)
        state2 := mulmod(mulmod(p, p, F), state2, F)
        p := mulmod(state3, state3, F)
        state3 := mulmod(mulmod(p, p, F), state3, F)

        // state0 pow5mod and M[] multiplications are pre-calculated

        mstore(
          0x0,
          mod(add(add(add(0x211184aac7468125da9b5527788aed6331caa8335774fe66f16acc6c66c456d7, mulmod(state1, M10, F)), mulmod(state2, M20, F)), mulmod(state3, M30, F)), F)
        )
        mstore(
          0x20,
          mod(add(add(add(0x19764435729b98150ca53b559b7b1bdd91692d645e831f4a30d30d510792687a, mulmod(state1, M11, F)), mulmod(state2, M21, F)), mulmod(state3, M31, F)), F)
        )
        mstore(
          0x80,
          mod(add(add(add(0x21f642c132b82c867835f1753eecedd4679085e8c78f6a0ae4a8cd81e9834bdf, mulmod(state1, M12, F)), mulmod(state2, M22, F)), mulmod(state3, M32, F)), F)
        )
        mstore(
          0xa0,
          mod(add(add(add(0x26bc2b5c607af61196105d955bd3d9b2cf795edcf9e39d1e508c542ca85d6be3, mulmod(state1, M13, F)), mulmod(state2, M23, F)), mulmod(state3, M33, F)), F)
        )
      }

      fRound(
        0x2e49c43c4569dd9c5fd35ac45fca33f10b15c590692f8beefe18f4896ac94902,
        0x0e35fb89981890520d4aef2b6d6506c3cb2f0b6973c24fa82731345ffa2d1f1e,
        0x251ad47cb15c4f1105f109ae5e944f1ba9d9e7806d667ffec6fe723002e0b996,
        0x13da07dc64d428369873e97160234641f8beb56fdd05e5f3563fa39d9c22df4e
      )

      fRound(
        0x0c009b84e650e6d23dc00c7dccef7483a553939689d350cd46e7b89055fd4738,
        0x011f16b1c63a854f01992e3956f42d8b04eb650c6d535eb0203dec74befdca06,
        0x0ed69e5e383a688f209d9a561daa79612f3f78d0467ad45485df07093f367549,
        0x04dba94a7b0ce9e221acad41472b6bbe3aec507f5eb3d33f463672264c9f789b
      )

      fRound(
        0x0a3f2637d840f3a16eb094271c9d237b6036757d4bb50bf7ce732ff1d4fa28e8,
        0x259a666f129eea198f8a1c502fdb38fa39b1f075569564b6e54a485d1182323f,
        0x28bf7459c9b2f4c6d8e7d06a4ee3a47f7745d4271038e5157a32fdf7ede0d6a1,
        0x0a1ca941f057037526ea200f489be8d4c37c85bbcce6a2aeec91bd6941432447
      )

      pRound(
        0x0c6f8f958be0e93053d7fd4fc54512855535ed1539f051dcb43a26fd926361cf,
        0x123106a93cd17578d426e8128ac9d90aa9e8a00708e296e084dd57e69caaf811,
        0x26e1ba52ad9285d97dd3ab52f8e840085e8fa83ff1e8f1877b074867cd2dee75,
        0x1cb55cad7bd133de18a64c5c47b9c97cbe4d8b7bf9e095864471537e6a4ae2c5
      )

      pRound(
        0x1dcd73e46acd8f8e0e2c7ce04bde7f6d2a53043d5060a41c7143f08e6e9055d0,
        0x011003e32f6d9c66f5852f05474a4def0cda294a0eb4e9b9b12b9bb4512e5574,
        0x2b1e809ac1d10ab29ad5f20d03a57dfebadfe5903f58bafed7c508dd2287ae8c,
        0x2539de1785b735999fb4dac35ee17ed0ef995d05ab2fc5faeaa69ae87bcec0a5
      )

      pRound(
        0x0c246c5a2ef8ee0126497f222b3e0a0ef4e1c3d41c86d46e43982cb11d77951d,
        0x192089c4974f68e95408148f7c0632edbb09e6a6ad1a1c2f3f0305f5d03b527b,
        0x1eae0ad8ab68b2f06a0ee36eeb0d0c058529097d91096b756d8fdc2fb5a60d85,
        0x179190e5d0e22179e46f8282872abc88db6e2fdc0dee99e69768bd98c5d06bfb
      )

      pRound(
        0x29bb9e2c9076732576e9a81c7ac4b83214528f7db00f31bf6cafe794a9b3cd1c,
        0x225d394e42207599403efd0c2464a90d52652645882aac35b10e590e6e691e08,
        0x064760623c25c8cf753d238055b444532be13557451c087de09efd454b23fd59,
        0x10ba3a0e01df92e87f301c4b716d8a394d67f4bf42a75c10922910a78f6b5b87
      )

      pRound(
        0x0e070bf53f8451b24f9c6e96b0c2a801cb511bc0c242eb9d361b77693f21471c,
        0x1b94cd61b051b04dd39755ff93821a73ccd6cb11d2491d8aa7f921014de252fb,
        0x1d7cb39bafb8c744e148787a2e70230f9d4e917d5713bb050487b5aa7d74070b,
        0x2ec93189bd1ab4f69117d0fe980c80ff8785c2961829f701bb74ac1f303b17db
      )

      pRound(
        0x2db366bfdd36d277a692bb825b86275beac404a19ae07a9082ea46bd83517926,
        0x062100eb485db06269655cf186a68532985275428450359adc99cec6960711b8,
        0x0761d33c66614aaa570e7f1e8244ca1120243f92fa59e4f900c567bf41f5a59b,
        0x20fc411a114d13992c2705aa034e3f315d78608a0f7de4ccf7a72e494855ad0d
      )

      pRound(
        0x25b5c004a4bdfcb5add9ec4e9ab219ba102c67e8b3effb5fc3a30f317250bc5a,
        0x23b1822d278ed632a494e58f6df6f5ed038b186d8474155ad87e7dff62b37f4b,
        0x22734b4c5c3f9493606c4ba9012499bf0f14d13bfcfcccaa16102a29cc2f69e0,
        0x26c0c8fe09eb30b7e27a74dc33492347e5bdff409aa3610254413d3fad795ce5
      )

      pRound(
        0x070dd0ccb6bd7bbae88eac03fa1fbb26196be3083a809829bbd626df348ccad9,
        0x12b6595bdb329b6fb043ba78bb28c3bec2c0a6de46d8c5ad6067c4ebfd4250da,
        0x248d97d7f76283d63bec30e7a5876c11c06fca9b275c671c5e33d95bb7e8d729,
        0x1a306d439d463b0816fc6fd64cc939318b45eb759ddde4aa106d15d9bd9baaaa
      )

      pRound(
        0x28a8f8372e3c38daced7c00421cb4621f4f1b54ddc27821b0d62d3d6ec7c56cf,
        0x0094975717f9a8a8bb35152f24d43294071ce320c829f388bc852183e1e2ce7e,
        0x04d5ee4c3aa78f7d80fde60d716480d3593f74d4f653ae83f4103246db2e8d65,
        0x2a6cf5e9aa03d4336349ad6fb8ed2269c7bef54b8822cc76d08495c12efde187
      )

      pRound(
        0x2304d31eaab960ba9274da43e19ddeb7f792180808fd6e43baae48d7efcba3f3,
        0x03fd9ac865a4b2a6d5e7009785817249bff08a7e0726fcb4e1c11d39d199f0b0,
        0x00b7258ded52bbda2248404d55ee5044798afc3a209193073f7954d4d63b0b64,
        0x159f81ada0771799ec38fca2d4bf65ebb13d3a74f3298db36272c5ca65e92d9a
      )

      pRound(
        0x1ef90e67437fbc8550237a75bc28e3bb9000130ea25f0c5471e144cf4264431f,
        0x1e65f838515e5ff0196b49aa41a2d2568df739bc176b08ec95a79ed82932e30d,
        0x2b1b045def3a166cec6ce768d079ba74b18c844e570e1f826575c1068c94c33f,
        0x0832e5753ceb0ff6402543b1109229c165dc2d73bef715e3f1c6e07c168bb173
      )

      pRound(
        0x02f614e9cedfb3dc6b762ae0a37d41bab1b841c2e8b6451bc5a8e3c390b6ad16,
        0x0e2427d38bd46a60dd640b8e362cad967370ebb777bedff40f6a0be27e7ed705,
        0x0493630b7c670b6deb7c84d414e7ce79049f0ec098c3c7c50768bbe29214a53a,
        0x22ead100e8e482674decdab17066c5a26bb1515355d5461a3dc06cc85327cea9
      )

      pRound(
        0x25b3e56e655b42cdaae2626ed2554d48583f1ae35626d04de5084e0b6d2a6f16,
        0x1e32752ada8836ef5837a6cde8ff13dbb599c336349e4c584b4fdc0a0cf6f9d0,
        0x2fa2a871c15a387cc50f68f6f3c3455b23c00995f05078f672a9864074d412e5,
        0x2f569b8a9a4424c9278e1db7311e889f54ccbf10661bab7fcd18e7c7a7d83505
      )

      pRound(
        0x044cb455110a8fdd531ade530234c518a7df93f7332ffd2144165374b246b43d,
        0x227808de93906d5d420246157f2e42b191fe8c90adfe118178ddc723a5319025,
        0x02fcca2934e046bc623adead873579865d03781ae090ad4a8579d2e7a6800355,
        0x0ef915f0ac120b876abccceb344a1d36bad3f3c5ab91a8ddcbec2e060d8befac
      )

      pRound(
        0x1797130f4b7a3e1777eb757bc6f287f6ab0fb85f6be63b09f3b16ef2b1405d38,
        0x0a76225dc04170ae3306c85abab59e608c7f497c20156d4d36c668555decc6e5,
        0x1fffb9ec1992d66ba1e77a7b93209af6f8fa76d48acb664796174b5326a31a5c,
        0x25721c4fc15a3f2853b57c338fa538d85f8fbba6c6b9c6090611889b797b9c5f
      )

      pRound(
        0x0c817fd42d5f7a41215e3d07ba197216adb4c3790705da95eb63b982bfcaf75a,
        0x13abe3f5239915d39f7e13c2c24970b6df8cf86ce00a22002bc15866e52b5a96,
        0x2106feea546224ea12ef7f39987a46c85c1bc3dc29bdbd7a92cd60acb4d391ce,
        0x21ca859468a746b6aaa79474a37dab49f1ca5a28c748bc7157e1b3345bb0f959
      )

      pRound(
        0x05ccd6255c1e6f0c5cf1f0df934194c62911d14d0321662a8f1a48999e34185b,
        0x0f0e34a64b70a626e464d846674c4c8816c4fb267fe44fe6ea28678cb09490a4,
        0x0558531a4e25470c6157794ca36d0e9647dbfcfe350d64838f5b1a8a2de0d4bf,
        0x09d3dca9173ed2faceea125157683d18924cadad3f655a60b72f5864961f1455
      )

      pRound(
        0x0328cbd54e8c0913493f866ed03d218bf23f92d68aaec48617d4c722e5bd4335,
        0x2bf07216e2aff0a223a487b1a7094e07e79e7bcc9798c648ee3347dd5329d34b,
        0x1daf345a58006b736499c583cb76c316d6f78ed6a6dffc82111e11a63fe412df,
        0x176563472456aaa746b694c60e1823611ef39039b2edc7ff391e6f2293d2c404
      )

      pRound(
        0x2ef1e0fad9f08e87a3bb5e47d7e33538ca964d2b7d1083d4fb0225035bd3f8db,
        0x226c9b1af95babcf17b2b1f57c7310179c1803dec5ae8f0a1779ed36c817ae2a,
        0x14bce3549cc3db7428126b4c3a15ae0ff8148c89f13fb35d35734eb5d4ad0def,
        0x2debff156e276bb5742c3373f2635b48b8e923d301f372f8e550cfd4034212c7
      )

      pRound(
        0x2d4083cf5a87f5b6fc2395b22e356b6441afe1b6b29c47add7d0432d1d4760c7,
        0x0c225b7bcd04bf9c34b911262fdc9c1b91bf79a10c0184d89c317c53d7161c29,
        0x03152169d4f3d06ec33a79bfac91a02c99aa0200db66d5aa7b835265f9c9c8f3,
        0x0b61811a9210be78b05974587486d58bddc8f51bfdfebbb87afe8b7aa7d3199c
      )

      pRound(
        0x203e000cad298daaf7eba6a5c5921878b8ae48acf7048f16046d637a533b6f78,
        0x1a44bf0937c722d1376672b69f6c9655ba7ee386fda1112c0757143d1bfa9146,
        0x0376b4fae08cb03d3500afec1a1f56acb8e0fde75a2106d7002f59c5611d4daa,
        0x00780af2ca1cad6465a2171250fdfc32d6fc241d3214177f3d553ef363182185
      )

      pRound(
        0x10774d9ab80c25bdeb808bedfd72a8d9b75dbe18d5221c87e9d857079bdc31d5,
        0x10dc6e9c006ea38b04b1e03b4bd9490c0d03f98929ca1d7fb56821fd19d3b6e8,
        0x00544b8338791518b2c7645a50392798b21f75bb60e3596170067d00141cac16,
        0x222c01175718386f2e2e82eb122789e352e105a3b8fa852613bc534433ee428c
      )

      pRound(
        0x2840d045e9bc22b259cfb8811b1e0f45b77f7bdb7f7e2b46151a1430f608e3c5,
        0x062752f86eebe11a009c937e468c335b04554574c2990196508e01fa5860186b,
        0x06041bdac48205ac87adb87c20a478a71c9950c12a80bc0a55a8e83eaaf04746,
        0x04a533f236c422d1ff900a368949b0022c7a2ae092f308d82b1dcbbf51f5000d
      )

      pRound(
        0x13e31d7a67232fd811d6a955b3d4f25dfe066d1e7dc33df04bde50a2b2d05b2a,
        0x011c2683ae91eb4dfbc13d6357e8599a9279d1648ff2c95d2f79905bb13920f1,
        0x0b0d219346b8574525b1a270e0b4cba5d56c928e3e2c2bd0a1ecaed015aaf6ae,
        0x14abdec8db9c6dc970291ee638690209b65080781ef9fd13d84c7a726b5f1364
      )

      pRound(
        0x1a0b70b4b26fdc28fcd32aa3d266478801eb12202ef47ced988d0376610be106,
        0x278543721f96d1307b6943f9804e7fe56401deb2ef99c4d12704882e7278b607,
        0x16eb59494a9776cf57866214dbd1473f3f0738a325638d8ba36535e011d58259,
        0x2567a658a81ffb444f240088fa5524c69a9e53eeab6b7f8c41c3479dcf8c644a
      )

      pRound(
        0x29aa1d7c151e9ad0a7ab39f1abd9cf77ab78e0215a5715a6b882ade840bb13d8,
        0x15c091233e60efe0d4bbfce2b36415006a4f017f9a85388ce206b91f99f2c984,
        0x16bd7d22ff858e5e0882c2c999558d77e7673ad5f1915f9feb679a8115f014cf,
        0x02db50480a07be0eb2c2e13ed6ef4074c0182d9b668b8e08ffe6769250042025
      )

      pRound(
        0x05e4a220e6a3bc9f7b6806ec9d6cdba186330ef2bf7adb4c13ba866343b73119,
        0x1dda05ebc30170bc98cbf2a5ee3b50e8b5f70bc424d39fa4104d37f1cbcf7a42,
        0x0184bef721888187f645b6fee3667f3c91da214414d89ba5cd301f22b0de8990,
        0x1498a307e68900065f5e8276f62aef1c37414b84494e1577ad1a6d64341b78ec
      )

      pRound(
        0x25f40f82b31dacc4f4939800b9d2c3eacef737b8fab1f864fe33548ad46bd49d,
        0x09d317cc670251943f6f5862a30d2ea9e83056ce4907bfbbcb1ff31ce5bb9650,
        0x2f77d77786d979b23ba4ce4a4c1b3bd0a41132cd467a86ab29b913b6cf3149d0,
        0x0f53dafd535a9f4473dc266b6fccc6841bbd336963f254c152f89e785f729bbf
      )

      pRound(
        0x25c1fd72e223045265c3a099e17526fa0e6976e1c00baf16de96de85deef2fa2,
        0x2a902c8980c17faae368d385d52d16be41af95c84eaea3cf893e65d6ce4a8f62,
        0x1ce1580a3452ecf302878c8976b82be96676dd114d1dc8d25527405762f83529,
        0x24a6073f91addc33a49a1fa306df008801c5ec569609034d2fc50f7f0f4d0056
      )

      pRound(
        0x25e52dbd6124530d9fc27fe306d71d4583e07ca554b5d1577f256c68b0be2b74,
        0x23dffae3c423fa7a93468dbccfb029855974be4d0a7b29946796e5b6cd70f15d,
        0x06342da370cc0d8c49b77594f6b027c480615d50be36243a99591bc9924ed6f5,
        0x2754114281286546b75f09f115fc751b4778303d0405c1b4cc7df0d8e9f63925
      )

      pRound(
        0x15c19e8534c5c1a8862c2bc1d119eddeabf214153833d7bdb59ee197f8187cf5,
        0x265fe062766d08fab4c78d0d9ef3cabe366f3be0a821061679b4b3d2d77d5f3e,
        0x13ccf689d67a3ec9f22cb7cd0ac3a327d377ac5cd0146f048debfd098d3ec7be,
        0x17662f7456789739f81cd3974827a887d92a5e05bdf3fe6b9fbccca4524aaebd
      )

      pRound(
        0x21b29c76329b31c8ef18631e515f7f2f82ca6a5cca70cee4e809fd624be7ad5d,
        0x18137478382aadba441eb97fe27901989c06738165215319939eb17b01fa975c,
        0x2bc07ea2bfad68e8dc724f5fef2b37c2d34f761935ffd3b739ceec4668f37e88,
        0x2ddb2e376f54d64a563840480df993feb4173203c2bd94ad0e602077aef9a03e
      )

      pRound(
        0x277eb50f2baa706106b41cb24c602609e8a20f8d72f613708adb25373596c3f7,
        0x0d4de47e1aba34269d0c620904f01a56b33fc4b450c0db50bb7f87734c9a1fe5,
        0x0b8442bfe9e4a1b4428673b6bd3eea6f9f445697058f134aae908d0279a29f0c,
        0x11fe5b18fbbea1a86e06930cb89f7d4a26e186a65945e96574247fddb720f8f5
      )

      pRound(
        0x224026f6dfaf71e24d25d8f6d9f90021df5b774dcad4d883170e4ad89c33a0d6,
        0x0b2ca6a999fe6887e0704dad58d03465a96bc9e37d1091f61bc9f9c62bbeb824,
        0x221b63d66f0b45f9d40c54053a28a06b1d0a4ce41d364797a1a7e0c96529f421,
        0x30185c48b7b2f1d53d4120801b047d087493bce64d4d24aedce2f4836bb84ad4
      )

      pRound(
        0x23f5d372a3f0e3cba989e223056227d3533356f0faa48f27f8267318632a61f0,
        0x2716683b32c755fd1bf8235ea162b1f388e1e0090d06162e8e6dfbe4328f3e3b,
        0x0977545836866fa204ca1d853ec0909e3d140770c80ac67dc930c69748d5d4bc,
        0x1444e8f592bdbfd8025d91ab4982dd425f51682d31472b05e81c43c0f9434b31
      )

      pRound(
        0x26e04b65e9ca8270beb74a1c5cb8fee8be3ffbfe583f7012a00f874e7718fbe3,
        0x22a5c2fa860d11fe34ee47a5cd9f869800f48f4febe29ad6df69816fb1a914d2,
        0x174b54d9907d8f5c6afd672a738f42737ec338f3a0964c629f7474dd44c5c8d7,
        0x1db1db8aa45283f31168fa66694cf2808d2189b87c8c8143d56c871907b39b87
      )

      pRound(
        0x1530bf0f46527e889030b8c7b7dfde126f65faf8cce0ab66387341d813d1bfd1,
        0x0b73f613993229f59f01c1cec8760e9936ead9edc8f2814889330a2f2bade457,
        0x29c25a22fe2164604552aaea377f448d587ab977fc8227787bd2dc0f36bcf41e,
        0x2b30d53ed1759bfb8503da66c92cf4077abe82795dc272b377df57d77c875526
      )

      pRound(
        0x12f6d703b5702aab7b7b7e69359d53a2756c08c85ede7227cf5f0a2916787cd2,
        0x2520e18300afda3f61a40a0b8837293a55ad01071028d4841ffa9ac706364113,
        0x1ec9daea860971ecdda8ed4f346fa967ac9bc59278277393c68f09fa03b8b95f,
        0x0a99b3e178db2e2e432f5cd5bef8fe4483bf5cbf70ed407c08aae24b830ad725
      )

      pRound(
        0x07cda9e63db6e39f086b89b601c2bbe407ee0abac3c817a1317abad7c5778492,
        0x08c9c65a4f955e8952d571b191bb0adb49bd8290963203b35d48aab38f8fc3a3,
        0x2737f8ce1d5a67b349590ddbfbd709ed9af54a2a3f2719d33801c9c17bdd9c9e,
        0x1049a6c65ff019f0d28770072798e8b7909432bd0c129813a9f179ba627f7d6a
      )

      pRound(
        0x18b4fe968732c462c0ea5a9beb27cecbde8868944fdf64ee60a5122361daeddb,
        0x2ff2b6fd22df49d2440b2eaeeefa8c02a6f478cfcf11f1b2a4f7473483885d19,
        0x2ec5f2f1928fe932e56c789b8f6bbcb3e8be4057cbd8dbd18a1b352f5cef42ff,
        0x265a5eccd8b92975e33ad9f75bf3426d424a4c6a7794ee3f08c1d100378e545e
      )

      pRound(
        0x2405eaa4c0bde1129d6242bb5ada0e68778e656cfcb366bf20517da1dfd4279c,
        0x094c97d8c194c42e88018004cbbf2bc5fdb51955d8b2d66b76dd98a2dbf60417,
        0x2c30d5f33bb32c5c22b9979a605bf64d508b705221e6a686330c9625c2afe0b8,
        0x01a75666f6241f6825d01cc6dcb1622d4886ea583e87299e6aa2fc716fdb6cf5
      )

      pRound(
        0x0a3290e8398113ea4d12ac091e87be7c6d359ab9a66979fcf47bf2e87d382fcb,
        0x154ade9ca36e268dfeb38461425bb0d8c31219d8fa0dfc75ecd21bf69aa0cc74,
        0x27aa8d3e25380c0b1b172d79c6f22eee99231ef5dc69d8dc13a4b5095d028772,
        0x2cf4051e6cab48301a8b2e3bca6099d756bbdf485afa1f549d395bbcbd806461
      )

      pRound(
        0x301e70f729f3c94b1d3f517ddff9f2015131feab8afa5eebb0843d7f84b23e71,
        0x298beb64f812d25d8b4d9620347ab02332dc4cef113ae60d17a8d7a4c91f83bc,
        0x1b362e72a5f847f84d03fd291c3c471ed1c14a15b221680acf11a3f02e46aa95,
        0x0dc8a2146110c0b375432902999223d5aa1ef6e78e1e5ebcbc1d9ba41dc1c737
      )

      pRound(
        0x0a48663b34ce5e1c05dc93092cb69778cb21729a72ddc03a08afa1eb922ff279,
        0x0a87391fb1cd8cdf6096b64a82f9e95f0fe46f143b702d74545bb314881098ee,
        0x1b5b2946f7c28975f0512ff8e6ca362f8826edd7ea9c29f382ba8a2a0892fd5d,
        0x01001cf512ac241d47ebe2239219bc6a173a8bbcb8a5b987b4eac1f533315b6b
      )

      pRound(
        0x2fd977c70f645db4f704fa7d7693da727ac093d3fb5f5febc72beb17d8358a32,
        0x23c0039a3fab4ad3c2d7cc688164f39e761d5355c05444d99be763a97793a9c4,
        0x19d43ee0c6081c052c9c0df6161eaac1aec356cf435888e79f27f22ff03fa25d,
        0x2d9b10c2f2e7ac1afddccffd94a563028bf29b646d020830919f9d5ca1cefe59
      )

      pRound(
        0x2457ca6c2f2aa30ec47e4aff5a66f5ce2799283e166fc81cdae2f2b9f83e4267,
        0x0abc392fe85eda855820592445094022811ee8676ed6f0c3044dfb54a7c10b35,
        0x19d2cc5ca549d1d40cebcd37f3ea54f31161ac3993acf3101d2c2bc30eac1eb0,
        0x0f97ae3033ffa01608aafb26ae13cd393ee0e4ec041ba644a3d3ab546e98c9c8
      )

      pRound(
        0x16dbc78fd28b7fb8260e404cf1d427a7fa15537ea4e168e88a166496e88cfeca,
        0x240faf28f11499b916f085f73bc4f22eef8344e576f8ad3d1827820366d5e07b,
        0x0a1bb075aa37ff0cfe6c8531e55e1770eaba808c8fdb6dbf46f8cab58d9ef1af,
        0x2e47e15ea4a47ff1a6a853aaf3a644ca38d5b085ac1042fdc4a705a7ce089f4d
      )

      pRound(
        0x166e5bf073378348860ca4a9c09d39e1673ab059935f4df35fb14528375772b6,
        0x18b42d7ffdd2ea4faf235902f057a2740cacccd027233001ed10f96538f0916f,
        0x089cb1b032238f5e4914788e3e3c7ead4fc368020b3ed38221deab1051c37702,
        0x242acd3eb3a2f72baf7c7076dd165adf89f9339c7b971921d9e70863451dd8d1
      )

      pRound(
        0x174fbb104a4ee302bf47f2bd82fce896eac9a068283f326474af860457245c3b,
        0x17340e71d96f466d61f3058ce092c67d2891fb2bb318613f780c275fe1116c6b,
        0x1e8e40ac853b7d42f00f2e383982d024f098b9f8fd455953a2fd380c4df7f6b2,
        0x0529898dc0649907e1d4d5e284b8d1075198c55cad66e8a9bf40f92938e2e961
      )

      pRound(
        0x2162754db0baa030bf7de5bb797364dce8c77aa017ee1d7bf65f21c4d4e5df8f,
        0x12c7553698c4bf6f3ceb250ae00c58c2a9f9291efbde4c8421bef44741752ec6,
        0x292643e3ba2026affcb8c5279313bd51a733c93353e9d9c79cb723136526508e,
        0x00ccf13e0cb6f9d81d52951bea990bd5b6c07c5d98e66ff71db6e74d5b87d158
      )

      pRound(
        0x185d1e20e23b0917dd654128cf2f3aaab6723873cb30fc22b0f86c15ab645b4b,
        0x14c61c836d55d3df742bdf11c60efa186778e3de0f024c0f13fe53f8d8764e1f,
        0x0f356841b3f556fce5dbe4680457691c2919e2af53008184d03ee1195d72449e,
        0x1b8fd9ff39714e075df124f887bf40b383143374fd2080ba0c0a6b6e8fa5b3e8
      )

      pRound(
        0x0e86a8c2009c140ca3f873924e2aaa14fc3c8ae04e9df0b3e9103418796f6024,
        0x2e6c5e898f5547770e5462ad932fcdd2373fc43820ca2b16b0861421e79155c8,
        0x05d797f1ab3647237c14f9d1df032bc9ff9fe1a0ecd377972ce5fd5a0c014604,
        0x29a3110463a5aae76c3d152875981d0c1daf2dcd65519ef5ca8929851da8c008
      )

      pRound(
        0x2974da7bc074322273c3a4b91c05354cdc71640a8bbd1f864b732f8163883314,
        0x1ed0fb06699ba249b2a30621c05eb12ca29cb91aa082c8bfcce9c522889b47dc,
        0x1c793ef0dcc51123654ff26d8d863feeae29e8c572eca912d80c8ae36e40fe9b,
        0x1e6aac1c6d3dd3157956257d3d234ef18c91e82589a78169fbb4a8770977dc2f
      )

      pRound(
        0x1a20ada7576234eee6273dd6fa98b25ed037748080a47d948fcda33256fb6bf5,
        0x191033d6d85ceaa6fc7a9a23a6fd9996642d772045ece51335d49306728af96c,
        0x006e5979da7e7ef53a825aa6fddc3abfc76f200b3740b8b232ef481f5d06297b,
        0x0b0d7e69c651910bbef3e68d417e9fa0fbd57f596c8f29831eff8c0174cdb06d
      )

      pRound(
        0x25caf5b0c1b93bc516435ec084e2ecd44ac46dbbb033c5112c4b20a25c9cdf9d,
        0x12c1ea892cc31e0d9af8b796d9645872f7f77442d62fd4c8085b2f150f72472a,
        0x16af29695157aba9b8bbe3afeb245feee5a929d9f928b9b81de6dadc78c32aae,
        0x0136df457c80588dd687fb2f3be18691705b87ec5a4cfdc168d31084256b67dc
      )

      pRound(
        0x1639a28c5b4c81166aea984fba6e71479e07b1efbc74434db95a285060e7b089,
        0x03d62fbf82fd1d4313f8e650f587ec06816c28b700bdc50f7e232bd9b5ca9b76,
        0x11aeeb527dc8ce44b4d14aaddca3cfe2f77a1e40fc6da97c249830de1edfde54,
        0x13f9b9a41274129479c5e6138c6c8ee36a670e6bc68c7a49642b645807bfc824
      )

      fRound(
        0x0e4772fa3d75179dc8484cd26c7c1f635ddeeed7a939440c506cae8b7ebcd15b,
        0x1b39a00cbc81e427de4bdec58febe8d8b5971752067a612b39fc46a68c5d4db4,
        0x2bedb66e1ad5a1d571e16e2953f48731f66463c2eb54a245444d1c0a3a25707e,
        0x2cf0a09a55ca93af8abd068f06a7287fb08b193b608582a27379ce35da915dec
      )

      fRound(
        0x2d1bd78fa90e77aa88830cabfef2f8d27d1a512050ba7db0753c8fb863efb387,
        0x065610c6f4f92491f423d3071eb83539f7c0d49c1387062e630d7fd283dc3394,
        0x2d933ff19217a5545013b12873452bebcc5f9969033f15ec642fb464bd607368,
        0x1aa9d3fe4c644910f76b92b3e13b30d500dae5354e79508c3c49c8aa99e0258b
      )

      fRound(
        0x027ef04869e482b1c748638c59111c6b27095fa773e1aca078cea1f1c8450bdd,
        0x2b7d524c5172cbbb15db4e00668a8c449f67a2605d9ec03802e3fa136ad0b8fb,
        0x0c7c382443c6aa787c8718d86747c7f74693ae25b1e55df13f7c3c1dd735db0f,
        0x00b4567186bc3f7c62a7b56acf4f76207a1f43c2d30d0fe4a627dcdd9bd79078
      )

      {
        let state0 := add(mload(0x0), 0x1e41fc29b825454fe6d61737fe08b47fb07fe739e4c1e61d0337490883db4fd5)
        let state1 := add(mload(0x20), 0x12507cd556b7bbcc72ee6dafc616584421e1af872d8c0e89002ae8d3ba0653b6)
        let state2 := add(mload(0x80), 0x13d437083553006bcef312e5e6f52a5d97eb36617ef36fe4d77d3e97f71cb5db)
        let state3 := add(mload(0xa0), 0x163ec73251f85443687222487dda9a65467d90b22f0b38664686077c6a4486d5)

        p := mulmod(state0, state0, F)
        state0 := mulmod(mulmod(p, p, F), state0, F)
        p := mulmod(state1, state1, F)
        state1 := mulmod(mulmod(p, p, F), state1, F)
        p := mulmod(state2, state2, F)
        state2 := mulmod(mulmod(p, p, F), state2, F)
        p := mulmod(state3, state3, F)
        state3 := mulmod(mulmod(p, p, F), state3, F)

        mstore(0x0, mod(mod(add(add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)), mulmod(state3, M30, F)), F), F))
        return(0, 0x20)
      }
    }
  }
}

// ---- vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/contracts/lib/ProofLib.sol ----
/**
 * @title ProofLib
 * @notice Facilitates accessing the public signals of a Groth16 proof.
 * @custom:semver 0.1.0
 */
library ProofLib {
  /*///////////////////////////////////////////////////////////////
                         WITHDRAWAL PROOF 
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Struct containing Groth16 proof elements and public signals for withdrawal verification
   * @dev The public signals array must match the order of public inputs/outputs in the circuit
   * @param pA First elliptic curve point (π_A) of the Groth16 proof, encoded as two field elements
   * @param pB Second elliptic curve point (π_B) of the Groth16 proof, encoded as 2x2 matrix of field elements
   * @param pC Third elliptic curve point (π_C) of the Groth16 proof, encoded as two field elements
   * @param pubSignals Array of public inputs and outputs:
   *        - [0] newCommitmentHash: Hash of the new commitment being created
   *        - [1] existingNullifierHash: Hash of the nullifier being spent
   *        - [2] withdrawnValue: Amount being withdrawn
   *        - [3] stateRoot: Current state root of the privacy pool
   *        - [4] stateTreeDepth: Current depth of the state tree
   *        - [5] ASPRoot: Current root of the Association Set Provider tree
   *        - [6] ASPTreeDepth: Current depth of the ASP tree
   *        - [7] context: Context value for the withdrawal operation
   */
  struct WithdrawProof {
    uint256[2] pA;
    uint256[2][2] pB;
    uint256[2] pC;
    uint256[8] pubSignals;
  }

  /**
   * @notice Retrieves the new commitment hash from the proof's public signals
   * @param _p The proof containing the public signals
   * @return The hash of the new commitment being created
   */
  function newCommitmentHash(WithdrawProof memory _p) internal pure returns (uint256) {
    return _p.pubSignals[0];
  }

  /**
   * @notice Retrieves the existing nullifier hash from the proof's public signals
   * @param _p The proof containing the public signals
   * @return The hash of the nullifier being spent in this withdrawal
   */
  function existingNullifierHash(WithdrawProof memory _p) internal pure returns (uint256) {
    return _p.pubSignals[1];
  }

  /**
   * @notice Retrieves the withdrawn value from the proof's public signals
   * @param _p The proof containing the public signals
   * @return The amount being withdrawn from Privacy Pool
   */
  function withdrawnValue(WithdrawProof memory _p) internal pure returns (uint256) {
    return _p.pubSignals[2];
  }

  /**
   * @notice Retrieves the state root from the proof's public signals
   * @param _p The proof containing the public signals
   * @return The root of the state tree at time of proof generation
   */
  function stateRoot(WithdrawProof memory _p) internal pure returns (uint256) {
    return _p.pubSignals[3];
  }

  /**
   * @notice Retrieves the state tree depth from the proof's public signals
   * @param _p The proof containing the public signals
   * @return The depth of the state tree at time of proof generation
   */
  function stateTreeDepth(WithdrawProof memory _p) internal pure returns (uint256) {
    return _p.pubSignals[4];
  }

  /**
   * @notice Retrieves the ASP root from the proof's public signals
   * @param _p The proof containing the public signals
   * @return The latest root of the ASP tree at time of proof generation
   */
  function ASPRoot(WithdrawProof memory _p) internal pure returns (uint256) {
    return _p.pubSignals[5];
  }

  /**
   * @notice Retrieves the ASP tree depth from the proof's public signals
   * @param _p The proof containing the public signals
   * @return The depth of the ASP tree at time of proof generation
   */
  function ASPTreeDepth(WithdrawProof memory _p) internal pure returns (uint256) {
    return _p.pubSignals[6];
  }

  /**
   * @notice Retrieves the context value from the proof's public signals
   * @param _p The proof containing the public signals
   * @return The context value binding the proof to specific withdrawal data
   */
  function context(WithdrawProof memory _p) internal pure returns (uint256) {
    return _p.pubSignals[7];
  }

  /*///////////////////////////////////////////////////////////////
                          RAGEQUIT PROOF 
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Struct containing Groth16 proof elements and public signals for ragequit verification
   * @dev The public signals array must match the order of public inputs/outputs in the circuit
   * @param pA First elliptic curve point (π_A) of the Groth16 proof, encoded as two field elements
   * @param pB Second elliptic curve point (π_B) of the Groth16 proof, encoded as 2x2 matrix of field elements
   * @param pC Third elliptic curve point (π_C) of the Groth16 proof, encoded as two field elements
   * @param pubSignals Array of public inputs and outputs:
   *        - [0] commitmentHash: Hash of the commitment being ragequit
   *        - [1] nullifierHash: Nullifier hash of commitment being ragequit
   *        - [2] value: Value of the commitment being ragequit
   *        - [3] label: Label of commitment
   */
  struct RagequitProof {
    uint256[2] pA;
    uint256[2][2] pB;
    uint256[2] pC;
    uint256[4] pubSignals;
  }

  /**
   * @notice Retrieves the new commitment hash from the proof's public signals
   * @param _p The ragequit proof containing the public signals
   * @return The new commitment hash
   */
  function commitmentHash(RagequitProof memory _p) internal pure returns (uint256) {
    return _p.pubSignals[0];
  }

  /**
   * @notice Retrieves the nullifier hash from the proof's public signals
   * @param _p The ragequit proof containing the public signals
   * @return The nullifier hash
   */
  function nullifierHash(RagequitProof memory _p) internal pure returns (uint256) {
    return _p.pubSignals[1];
  }

  /**
   * @notice Retrieves the commitment value from the proof's public signals
   * @param _p The ragequit proof containing the public signals
   * @return The commitment value
   */
  function value(RagequitProof memory _p) internal pure returns (uint256) {
    return _p.pubSignals[2];
  }

  /**
   * @notice Retrieves the commitment label from the proof's public signals
   * @param _p The ragequit proof containing the public signals
   * @return The commitment label
   */
  function label(RagequitProof memory _p) internal pure returns (uint256) {
    return _p.pubSignals[3];
  }
}

// ---- node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol ----
// OpenZeppelin Contracts (last updated v5.1.0) (token/ERC20/IERC20.sol)



/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

// ---- node_modules/@openzeppelin/contracts/interfaces/IERC20.sol ----
// OpenZeppelin Contracts (last updated v5.0.0) (interfaces/IERC20.sol)

// ---- vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/interfaces/IEntrypoint.sol ----
/**
 * @title IEntrypoint
 * @notice Interface for the Entrypoint contract
 */
interface IEntrypoint {
  /*///////////////////////////////////////////////////////////////
                              STRUCTS
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Struct for the asset configuration
   * @param pool The Privacy Pool contracts for the asset
   * @param minimumDepositAmount The minimum amount that can be deposited
   * @param vettingfeeBPS The deposit fee in basis points
   */
  struct AssetConfig {
    IPrivacyPool pool;
    uint256 minimumDepositAmount;
    uint256 vettingFeeBPS;
    uint256 maxRelayFeeBPS;
  }

  /**
   * @notice Struct for the relay data
   * @param recipient The recipient of the funds withdrawn from the pool
   * @param feeRecipient The recipient of the fee
   * @param relayfeeBPS The relay fee in basis points
   */
  struct RelayData {
    address recipient;
    address feeRecipient;
    uint256 relayFeeBPS;
  }

  /**
   * @notice Struct for the onchain association set data
   * @param root The ASP root
   * @param ipfsCID The IPFS v1 CID of the ASP data. A content-addressed identifier computed by hashing
   *                the content with SHA-256, adding multicodec/multihash prefixes, and encoding in base32/58.
   *                This uniquely identifies data by its content rather than location.
   * @param timestamp The timestamp on which the root was updated
   */
  struct AssociationSetData {
    uint256 root;
    string ipfsCID;
    uint256 timestamp;
  }

  /*///////////////////////////////////////////////////////////////
                              EVENTS
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Emitted when pushing a new root to the association root set
   * @param _root The latest ASP root
   * @param _ipfsCID The IPFS CID of the association set data
   * @param _timestamp The timestamp of root update
   */
  event RootUpdated(uint256 _root, string _ipfsCID, uint256 _timestamp);

  /**
   * @notice Emitted when pushing a new root to the association root set
   * @param _depositor The address of the depositor
   * @param _pool The Privacy Pool contract
   * @param _commitment The commitment hash for the deposit
   * @param _amount The amount of asset deposited
   */
  event Deposited(address indexed _depositor, IPrivacyPool indexed _pool, uint256 _commitment, uint256 _amount);

  /**
   * @notice Emitted when processing a withdrawal through the Entrypoint
   * @param _relayer The address of the relayer
   * @param _recipient The address of the withdrawal recipient
   * @param _asset The asset being withdrawn
   * @param _amount The amount of asset withdrawn
   * @param _feeAmount The fee paid to the relayer
   */
  event WithdrawalRelayed(
    address indexed _relayer, address indexed _recipient, IERC20 indexed _asset, uint256 _amount, uint256 _feeAmount
  );

  /**
   * @notice Emitted when withdrawing fees from the Entrypoint
   * @param _asset The asset being withdrawn
   * @param _recipient The address of the fees withdrawal recipient
   * @param _amount The amount of asset withdrawn
   */
  event FeesWithdrawn(IERC20 _asset, address _recipient, uint256 _amount);

  /**
   * @notice Emitted when winding down a Privacy Pool
   * @param _pool The Privacy Pool contract
   */
  event PoolWindDown(IPrivacyPool _pool);

  /**
   * @notice Emitted when registering a Privacy Pool in the Entrypoint registry
   * @param _pool The Privacy Pool contract
   * @param _asset The asset of the pool
   * @param _scope The unique scope of the pool
   */
  event PoolRegistered(IPrivacyPool _pool, IERC20 _asset, uint256 _scope);

  /**
   * @notice Emitted when removing a Privacy Pool from the Entrypoint registry
   * @param _pool The Privacy Pool contract
   * @param _asset The asset of the pool
   * @param _scope The unique scope of the pool
   */
  event PoolRemoved(IPrivacyPool _pool, IERC20 _asset, uint256 _scope);

  /**
   * @notice Emitted when updating the configuration of a Privacy Pool
   * @param _pool The Privacy Pool contract
   * @param _asset The asset of the pool
   * @param _newMinimumDepositAmount The updated minimum deposit amount
   * @param _newVettingFeeBPS The updated vetting fee in basis points
   * @param _newMaxRelayFeeBPS The updated maximum relay fee in basis points
   */
  event PoolConfigurationUpdated(
    IPrivacyPool _pool,
    IERC20 _asset,
    uint256 _newMinimumDepositAmount,
    uint256 _newVettingFeeBPS,
    uint256 _newMaxRelayFeeBPS
  );

  /*///////////////////////////////////////////////////////////////
                              ERRORS
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Thrown when trying to withdraw an invalid amount
   */
  error InvalidWithdrawalAmount();

  /**
   * @notice Thrown when trying to access a non-existent pool
   */
  error PoolNotFound();

  /**
   * @notice Thrown when trying to register a dead pool
   */
  error PoolIsDead();

  /**
   * @notice Thrown when trying to register a pool whose configured Entrypoint is not this one
   */
  error InvalidEntrypointForPool();

  /**
   * @notice Thrown when trying to register a pool for an asset that is already present in the registry
   */
  error AssetPoolAlreadyRegistered();

  /**
   * @notice Thrown when trying to register a pool for a scope that is already present in the registry
   */
  error ScopePoolAlreadyRegistered();

  /**
   * @notice Thrown when trying to deposit less than the minimum deposit amount
   */
  error MinimumDepositAmount();

  /**
   * @notice Thrown when trying to relay with a relayer fee greater than the maximum configured
   */
  error RelayFeeGreaterThanMax();

  /**
   * @notice Thrown when trying to process a withdrawal with an invalid processooor
   */
  error InvalidProcessooor();

  /**
   * @notice Thrown when finding an invalid state in the pool like an invalid asset balance
   */
  error InvalidPoolState();

  /**
   * @notice Thrown when trying to push a an IPFS CID with an invalid length
   */
  error InvalidIPFSCIDLength();

  /**
   * @notice Thrown when trying to push a root with an empty root
   */
  error EmptyRoot();

  /**
   * @notice Thrown when failing to send the native asset to an account
   */
  error NativeAssetTransferFailed();

  /**
   * @notice Thrown when an address parameter is zero
   */
  error ZeroAddress();

  /**
   * @notice Thrown when a fee in basis points is greater than 10000 (100%)
   */
  error InvalidFeeBPS();

  /**
   * @notice Thrown when trying to access an association set at an invalid index
   */
  error InvalidIndex();

  /**
   * @notice Thrown when trying to get the latest root when no roots exist
   */
  error NoRootsAvailable();

  /**
   * @notice Thrown when trying to register a pool with an asset that doesn't match the pool's asset
   */
  error AssetMismatch();

  /**
   * @notice Thrown when trying to send native asset to the Entrypoint
   */
  error NativeAssetNotAccepted();

  /**
   * @notice Thrown when trying to deposit using a precommitment that has already been used by another deposit
   */
  error PrecommitmentAlreadyUsed();

  /*//////////////////////////////////////////////////////////////
                                LOGIC
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Initializes the contract state
   * @param _owner The initial owner
   * @param _postman The initial postman
   */
  function initialize(address _owner, address _postman) external;

  /**
   * @notice Push a new root to the association root set
   * @param _root The new ASP root
   * @param _ipfsCID The IPFS v1 CID of the association set data
   * @return _index The index of the newly added root
   */
  function updateRoot(uint256 _root, string memory _ipfsCID) external returns (uint256 _index);

  /**
   * @notice Make a native asset deposit into the Privacy Pool
   * @param _precommitment The precommitment for the deposit
   * @return _commitment The deposit commitment hash
   */
  function deposit(uint256 _precommitment) external payable returns (uint256 _commitment);

  /**
   * @notice Make an ERC20 deposit into the Privacy Pool
   * @param _asset The asset to deposit
   * @param _value The amount of asset to deposit
   * @param _precommitment The precommitment for the deposit
   * @return _commitment The deposit commitment hash
   */
  function deposit(IERC20 _asset, uint256 _value, uint256 _precommitment) external returns (uint256 _commitment);

  /**
   * @notice Process a withdrawal
   * @param _withdrawal The `Withdrawal` struct
   * @param _proof The `WithdrawProof` struct containing the withdarawal proof signals
   * @param _scope The Pool scope to withdraw from
   */
  function relay(
    IPrivacyPool.Withdrawal calldata _withdrawal,
    ProofLib.WithdrawProof calldata _proof,
    uint256 _scope
  ) external;

  /**
   * @notice Register a Privacy Pool in the registry
   * @param _asset The asset of the pool
   * @param _pool The address of the Privacy Pool contract
   * @param _minimumDepositAmount The minimum deposit amount for the asset
   * @param _vettingFeeBPS The deposit fee in basis points
   * @param _maxRelayFeeBPS The maximum relay fee in basis points
   */
  function registerPool(
    IERC20 _asset,
    IPrivacyPool _pool,
    uint256 _minimumDepositAmount,
    uint256 _vettingFeeBPS,
    uint256 _maxRelayFeeBPS
  ) external;

  /**
   * @notice Remove a Privacy Pool from the registry
   * @param _asset The asset of the pool
   */
  function removePool(IERC20 _asset) external;

  /**
   * @notice Updates the configuration of a specific pool
   * @param _asset The asset of the pool to update
   * @param _minimumDepositAmount The new minimum deposit amount
   * @param _vettingFeeBPS The new vetting fee in basis points
   * @param _maxRelayFeeBPS The new max relay fee in basis points
   */
  function updatePoolConfiguration(
    IERC20 _asset,
    uint256 _minimumDepositAmount,
    uint256 _vettingFeeBPS,
    uint256 _maxRelayFeeBPS
  ) external;

  /**
   * @notice Irreversebly halt deposits from a Privacy Pool
   * @param _pool The Privacy Pool contract
   */
  function windDownPool(IPrivacyPool _pool) external;

  /**
   * @notice Withdraw fees from the Entrypoint
   * @param _asset The asset to withdraw
   * @param _recipient The recipient of the fees
   */
  function withdrawFees(IERC20 _asset, address _recipient) external;

  /*///////////////////////////////////////////////////////////////
                            VIEWS
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Returns the configured pool for a scope
   * @param _scope The unique scope of the pool
   * @return _pool The Privacy Pool contract
   */
  function scopeToPool(uint256 _scope) external view returns (IPrivacyPool _pool);

  /**
   * @notice Returns the configuration for an asset
   * @param _asset The asset address
   * @return _pool The Privacy Pool contract
   * @return _minimumDepositAmount The minimum deposit amount
   * @return _vettingFeeBPS The deposit fee in basis points
   * @return _maxRelayFeeBPS The max relayer fee in basis points
   */
  function assetConfig(IERC20 _asset)
    external
    view
    returns (IPrivacyPool _pool, uint256 _minimumDepositAmount, uint256 _vettingFeeBPS, uint256 _maxRelayFeeBPS);

  /**
   * @notice Returns the association set data at an index
   * @param _index The index of the array
   * @return _root The updated ASP root
   * @return _ipfsCID The IPFS v1 CID for the association set data
   * @return _timestamp The timestamp of the root update
   */
  function associationSets(uint256 _index)
    external
    view
    returns (uint256 _root, string memory _ipfsCID, uint256 _timestamp);

  /**
   * @notice Returns the latest ASP root
   * @return _root The latest ASP root
   */
  function latestRoot() external view returns (uint256 _root);

  /**
   * @notice Returns an ASP root by index
   * @param _index The index
   * @return _root The ASP root at the index
   */
  function rootByIndex(uint256 _index) external view returns (uint256 _root);

  /**
   * @notice Returns a boolean indicating if the precommitment has been used
   * @param _precommitment The precommitment hash
   * @return _used The usage status
   */
  function usedPrecommitments(uint256 _precommitment) external view returns (bool _used);
}

// ---- vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/interfaces/IVerifier.sol ----
/**
 * @title IVerifier
 * @notice Interface of the Groth16 verifier contracts
 */
interface IVerifier {
  /**
   * @notice Verifies a Withdrawal Proof
   * @param _pA First elliptic curve point (π_A) of the Groth16 proof, encoded as two field elements
   * @param _pB Second elliptic curve point (π_B) of the Groth16 proof, encoded as 2x2 matrix of field elements
   * @param _pC Third elliptic curve point (π_C) of the Groth16 proof, encoded as two field elements
   * @param _pubSignals The proof public signals (both input and output)
   * @return _valid The boolean indicating if the proof is valid
   */
  function verifyProof(
    uint256[2] memory _pA,
    uint256[2][2] memory _pB,
    uint256[2] memory _pC,
    uint256[8] memory _pubSignals
  ) external returns (bool _valid);

  /**
   * @notice Verifies a Ragequit Proof
   * @param _pA First elliptic curve point (π_A) of the Groth16 proof, encoded as two field elements
   * @param _pB Second elliptic curve point (π_B) of the Groth16 proof, encoded as 2x2 matrix of field elements
   * @param _pC Third elliptic curve point (π_C) of the Groth16 proof, encoded as two field elements
   * @param _pubSignals The proof public signals (both input and output)
   * @return _valid The boolean indicating if the proof is valid
   */
  function verifyProof(
    uint256[2] memory _pA,
    uint256[2][2] memory _pB,
    uint256[2] memory _pC,
    uint256[4] memory _pubSignals
  ) external returns (bool _valid);
}

// ---- vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/interfaces/IState.sol ----
/**
 * @title IState
 * @notice Interface for the State contract
 */
interface IState {
  /*///////////////////////////////////////////////////////////////
                              EVENTS
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Emitted when inserting a leaf into the Merkle Tree
   * @param _index The index of the leaf in the tree
   * @param _leaf The leaf value
   * @param _root The updated root
   */
  event LeafInserted(uint256 _index, uint256 _leaf, uint256 _root);

  /*///////////////////////////////////////////////////////////////
                              ERRORS
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Thrown when trying to call a method only available to the Entrypoint
   */
  error OnlyEntrypoint();

  /**
   * @notice Thrown when trying to deposit into a dead pool
   */
  error PoolIsDead();

  /**
   * @notice Thrown when trying to spend a nullifier that has already been spent
   */
  error NullifierAlreadySpent();

  /**
   * @notice Thrown when trying to initiate the ragequitting process of a commitment before the waiting period
   */
  error NotYetRagequitteable();

  /**
   * @notice Thrown when the max tree depth is reached and no more commitments can be inserted
   */
  error MaxTreeDepthReached();

  /**
   * @notice Thrown when trying to set a state variable as address zero
   */
  error ZeroAddress();

  /*///////////////////////////////////////////////////////////////
                              VIEWS 
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Returns the pool unique identifier
   * @return _scope The scope id
   */
  function SCOPE() external view returns (uint256 _scope);

  /**
   * @notice Returns the pool asset
   * @return _asset The asset address
   */
  function ASSET() external view returns (address _asset);

  /**
   * @notice Returns the root history size for root caching
   * @return _size The amount of valid roots to store
   */
  function ROOT_HISTORY_SIZE() external view returns (uint32 _size);

  /**
   * @notice Returns the maximum depth of the state tree
   * @dev Merkle tree depth must be capped at a fixed maximum because zero-knowledge circuits
   * compile to R1CS (Rank-1 Constraint System) constraints that must be determined at compile time.
   * R1CS cannot handle dynamic loops or recursion - all computation paths must be fully "unrolled"
   * into a fixed number of constraints. Since each level of the Merkle tree requires its own set
   * of constraints for hashing and path verification, we need to set a maximum depth that determines
   * the total constraint size of the circuit.
   * @return _maxDepth The max depth
   */
  function MAX_TREE_DEPTH() external view returns (uint32 _maxDepth);

  /**
   * @notice Returns the configured Entrypoint contract
   * @return _entrypoint The Entrypoint contract
   */
  function ENTRYPOINT() external view returns (IEntrypoint _entrypoint);

  /**
   * @notice Returns the configured Verifier contract for withdrawals
   * @return _verifier The Verifier contract
   */
  function WITHDRAWAL_VERIFIER() external view returns (IVerifier _verifier);

  /**
   * @notice Returns the configured Verifier contract for ragequits
   * @return _verifier The Verifier contract
   */
  function RAGEQUIT_VERIFIER() external view returns (IVerifier _verifier);

  /**
   * @notice Returns the current root index
   * @return _index The current index
   */
  function currentRootIndex() external view returns (uint32 _index);

  /**
   * @notice Returns the current state root
   * @return _root The current state root
   */
  function currentRoot() external view returns (uint256 _root);

  /**
   * @notice Returns the current state tree depth
   * @return _depth The current state tree depth
   */
  function currentTreeDepth() external view returns (uint256 _depth);

  /**
   * @notice Returns the current state tree size
   * @return _size The current state tree size
   */
  function currentTreeSize() external view returns (uint256 _size);

  /**
   * @notice Returns the current label nonce
   * @return _nonce The current nonce
   */
  function nonce() external view returns (uint256 _nonce);

  /**
   * @notice Returns the boolean indicating if the pool is dead
   * @return _dead The dead boolean
   */
  function dead() external view returns (bool _dead);

  /**
   * @notice Returns the root stored at an index
   * @param _index The root index
   * @return _root The root value
   */
  function roots(uint256 _index) external view returns (uint256 _root);

  /**
   * @notice Returns the spending status of a nullifier hash
   * @param _nullifierHash The nullifier hash
   * @return _spent The boolean indicating if it is spent
   */
  function nullifierHashes(uint256 _nullifierHash) external view returns (bool _spent);

  /**
   * @notice Returns the original depositor that generated a label
   * @param _label The label
   * @return _depositor The original depositor
   */
  function depositors(uint256 _label) external view returns (address _depositor);
}

// ---- vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/interfaces/IPrivacyPool.sol ----
/**
 * @title IPrivacyPool
 * @notice Interface for the PrivacyPool contract
 */
interface IPrivacyPool is IState {
  /*///////////////////////////////////////////////////////////////
                              STRUCTS
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Struct for the withdrawal request
   * @dev The integrity of this data is ensured by the `context` signal in the proof
   * @param processooor The allowed address to process the withdrawal
   * @param data Encoded arbitrary data used by the Entrypoint
   */
  struct Withdrawal {
    address processooor;
    bytes data;
  }

  /*///////////////////////////////////////////////////////////////
                              EVENTS
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Emitted when making a user deposit
   * @param _depositor The address of the depositor
   * @param _commitment The commitment hash
   * @param _label The deposit generated label
   * @param _value The deposited amount
   * @param _precommitmentHash The deposit precommitment hash
   */
  event Deposited(
    address indexed _depositor, uint256 _commitment, uint256 _label, uint256 _value, uint256 _precommitmentHash
  );

  /**
   * @notice Emitted when processing a withdrawal
   * @param _processooor The address which processed the withdrawal
   * @param _value The withdrawn amount
   * @param _spentNullifier The spent nullifier
   * @param _newCommitment The new commitment hash
   */
  event Withdrawn(address indexed _processooor, uint256 _value, uint256 _spentNullifier, uint256 _newCommitment);

  /**
   * @notice Emitted when ragequitting a commitment
   * @param _ragequitter The address who ragequit
   * @param _commitment The ragequit commitment
   * @param _label The commitment label
   * @param _value The ragequit amount
   */
  event Ragequit(address indexed _ragequitter, uint256 _commitment, uint256 _label, uint256 _value);

  /**
   * @notice Emitted irreversibly suspending deposits
   */
  event PoolDied();

  /*///////////////////////////////////////////////////////////////
                              ERRORS
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Thrown when failing to verify a withdrawal proof through the Groth16 verifier
   */
  error InvalidProof();

  /**
   * @notice Thrown when trying to spend a commitment that does not exist in the state
   */
  error InvalidCommitment();

  /**
   * @notice Thrown when calling `withdraw` while not being the allowed processooor
   */
  error InvalidProcessooor();

  /**
   * @notice Thrown when calling `withdraw` with a ASP or state tree depth greater or equal than the max tree depth
   */
  error InvalidTreeDepth();

  /**
   * @notice Thrown when trying to deposit an amount higher than 2**128
   */
  error InvalidDepositValue();

  /**
   * @notice Thrown when providing an invalid scope for this pool
   */
  error ScopeMismatch();

  /**
   * @notice Thrown when providing an invalid context for the pool and withdrawal
   */
  error ContextMismatch();

  /**
   * @notice Thrown when providing an unknown or outdated state root
   */
  error UnknownStateRoot();

  /**
   * @notice Thrown when providing an unknown or outdated ASP root
   */
  error IncorrectASPRoot();

  /**
   * @notice Thrown when trying to ragequit while not being the original depositor
   */
  error OnlyOriginalDepositor();

  /*///////////////////////////////////////////////////////////////
                              LOGIC
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Deposit funds into the Privacy Pool
   * @dev Only callable by the Entrypoint
   * @param _depositor The depositor address
   * @param _value The value being deposited
   * @param _precommitment The precommitment hash
   * @return _commitment The commitment hash
   */
  function deposit(
    address _depositor,
    uint256 _value,
    uint256 _precommitment
  ) external payable returns (uint256 _commitment);

  /**
   * @notice Privately withdraw funds by spending an existing commitment
   * @param _w The `Withdrawal` struct
   * @param _p The `WithdrawProof` struct
   */
  function withdraw(Withdrawal memory _w, ProofLib.WithdrawProof memory _p) external;

  /**
   * @notice Publicly withdraw funds to original depositor without exposing secrets
   * @dev Only callable by the original depositor
   * @param _p the `RagequitProof` struct
   */
  function ragequit(ProofLib.RagequitProof memory _p) external;

  /**
   * @notice Irreversibly suspends deposits
   * @dev Withdrawals can never be disabled
   * @dev Only callable by the Entrypoint
   */
  function windDown() external;
}

/**
 * @title IPrivacyPoolSimple
 * @notice Interface for the PrivacyPool native asset implementation
 */
interface IPrivacyPoolSimple is IPrivacyPool {
  /*///////////////////////////////////////////////////////////////
                              ERRORS
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Thrown when sending less amount of native asset than required
   */
  error InsufficientValue();

  /**
   * @notice Thrown when failing to send native asset to an account
   */
  error FailedToSendNativeAsset();
}

/**
 * @title IPrivacyPoolComplex
 * @notice Interface for the PrivacyPool ERC20 implementation
 */
interface IPrivacyPoolComplex is IPrivacyPool {
  /*///////////////////////////////////////////////////////////////
                              ERRORS
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Thrown when sending sending any amount of native asset
   */
  error NativeAssetNotAccepted();

  /**
   * @notice Thrown when trying to set up a complex pool with the native asset
   */
  error NativeAssetNotSupported();
}

// ---- node_modules/poseidon-solidity/PoseidonT3.sol ----
library PoseidonT3 {
  uint constant M00 = 0x109b7f411ba0e4c9b2b70caf5c36a7b194be7c11ad24378bfedb68592ba8118b;
  uint constant M01 = 0x2969f27eed31a480b9c36c764379dbca2cc8fdd1415c3dded62940bcde0bd771;
  uint constant M02 = 0x143021ec686a3f330d5f9e654638065ce6cd79e28c5b3753326244ee65a1b1a7;
  uint constant M10 = 0x16ed41e13bb9c0c66ae119424fddbcbc9314dc9fdbdeea55d6c64543dc4903e0;
  uint constant M11 = 0x2e2419f9ec02ec394c9871c832963dc1b89d743c8c7b964029b2311687b1fe23;
  uint constant M12 = 0x176cc029695ad02582a70eff08a6fd99d057e12e58e7d7b6b16cdfabc8ee2911;

  // See here for a simplified implementation: https://github.com/vimwitch/poseidon-solidity/blob/e57becdabb65d99fdc586fe1e1e09e7108202d53/contracts/Poseidon.sol#L40
  // Inspired by: https://github.com/iden3/circomlibjs/blob/v0.0.8/src/poseidon_slow.js
  function hash(uint[2] memory) public pure returns (uint) {
    assembly {
      let F := 21888242871839275222246405745257275088548364400416034343698204186575808495617
      let M20 := 0x2b90bba00fca0589f617e7dcbfe82e0df706ab640ceb247b791a93b74e36736d
      let M21 := 0x101071f0032379b697315876690f053d148d4e109f5fb065c8aacc55a0f89bfa
      let M22 := 0x19a3fc0a56702bf417ba7fee3802593fa644470307043f7773279cd71d25d5e0

      // load the inputs from memory
      let state1 := add(mod(mload(0x80), F), 0x00f1445235f2148c5986587169fc1bcd887b08d4d00868df5696fff40956e864)
      let state2 := add(mod(mload(0xa0), F), 0x08dff3487e8ac99e1f29a058d0fa80b930c728730b7ab36ce879f3890ecf73f5)
      let scratch0 := mulmod(state1, state1, F)
      state1 := mulmod(mulmod(scratch0, scratch0, F), state1, F)
      scratch0 := mulmod(state2, state2, F)
      state2 := mulmod(mulmod(scratch0, scratch0, F), state2, F)
      scratch0 := add(
        0x2f27be690fdaee46c3ce28f7532b13c856c35342c84bda6e20966310fadc01d0,
        add(add(15452833169820924772166449970675545095234312153403844297388521437673434406763, mulmod(state1, M10, F)), mulmod(state2, M20, F))
      )
      let scratch1 := add(
        0x2b2ae1acf68b7b8d2416bebf3d4f6234b763fe04b8043ee48b8327bebca16cf2,
        add(add(18674271267752038776579386132900109523609358935013267566297499497165104279117, mulmod(state1, M11, F)), mulmod(state2, M21, F))
      )
      let scratch2 := add(
        0x0319d062072bef7ecca5eac06f97d4d55952c175ab6b03eae64b44c7dbf11cfa,
        add(add(14817777843080276494683266178512808687156649753153012854386334860566696099579, mulmod(state1, M12, F)), mulmod(state2, M22, F))
      )
      let state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := mulmod(scratch1, scratch1, F)
      scratch1 := mulmod(mulmod(state0, state0, F), scratch1, F)
      state0 := mulmod(scratch2, scratch2, F)
      scratch2 := mulmod(mulmod(state0, state0, F), scratch2, F)
      state0 := add(0x28813dcaebaeaa828a376df87af4a63bc8b7bf27ad49c6298ef7b387bf28526d, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x2727673b2ccbc903f181bf38e1c1d40d2033865200c352bc150928adddf9cb78, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x234ec45ca27727c2e74abd2b2a1494cd6efbd43e340587d6b8fb9e31e65cc632, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := mulmod(state1, state1, F)
      state1 := mulmod(mulmod(scratch0, scratch0, F), state1, F)
      scratch0 := mulmod(state2, state2, F)
      state2 := mulmod(mulmod(scratch0, scratch0, F), state2, F)
      scratch0 := add(0x15b52534031ae18f7f862cb2cf7cf760ab10a8150a337b1ccd99ff6e8797d428, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x0dc8fad6d9e4b35f5ed9a3d186b79ce38e0e8a8d1b58b132d701d4eecf68d1f6, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x1bcd95ffc211fbca600f705fad3fb567ea4eb378f62e1fec97805518a47e4d9c, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := mulmod(scratch1, scratch1, F)
      scratch1 := mulmod(mulmod(state0, state0, F), scratch1, F)
      state0 := mulmod(scratch2, scratch2, F)
      scratch2 := mulmod(mulmod(state0, state0, F), scratch2, F)
      state0 := add(0x10520b0ab721cadfe9eff81b016fc34dc76da36c2578937817cb978d069de559, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x1f6d48149b8e7f7d9b257d8ed5fbbaf42932498075fed0ace88a9eb81f5627f6, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x1d9655f652309014d29e00ef35a2089bfff8dc1c816f0dc9ca34bdb5460c8705, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x04df5a56ff95bcafb051f7b1cd43a99ba731ff67e47032058fe3d4185697cc7d, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x0672d995f8fff640151b3d290cedaf148690a10a8c8424a7f6ec282b6e4be828, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x099952b414884454b21200d7ffafdd5f0c9a9dcc06f2708e9fc1d8209b5c75b9, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := add(0x052cba2255dfd00c7c483143ba8d469448e43586a9b4cd9183fd0e843a6b9fa6, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x0b8badee690adb8eb0bd74712b7999af82de55707251ad7716077cb93c464ddc, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x119b1590f13307af5a1ee651020c07c749c15d60683a8050b963d0a8e4b2bdd1, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x03150b7cd6d5d17b2529d36be0f67b832c4acfc884ef4ee5ce15be0bfb4a8d09, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x2cc6182c5e14546e3cf1951f173912355374efb83d80898abe69cb317c9ea565, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x005032551e6378c450cfe129a404b3764218cadedac14e2b92d2cd73111bf0f9, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := add(0x233237e3289baa34bb147e972ebcb9516469c399fcc069fb88f9da2cc28276b5, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x05c8f4f4ebd4a6e3c980d31674bfbe6323037f21b34ae5a4e80c2d4c24d60280, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x0a7b1db13042d396ba05d818a319f25252bcf35ef3aeed91ee1f09b2590fc65b, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x2a73b71f9b210cf5b14296572c9d32dbf156e2b086ff47dc5df542365a404ec0, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x1ac9b0417abcc9a1935107e9ffc91dc3ec18f2c4dbe7f22976a760bb5c50c460, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x12c0339ae08374823fabb076707ef479269f3e4d6cb104349015ee046dc93fc0, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := add(0x0b7475b102a165ad7f5b18db4e1e704f52900aa3253baac68246682e56e9a28e, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x037c2849e191ca3edb1c5e49f6e8b8917c843e379366f2ea32ab3aa88d7f8448, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x05a6811f8556f014e92674661e217e9bd5206c5c93a07dc145fdb176a716346f, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x29a795e7d98028946e947b75d54e9f044076e87a7b2883b47b675ef5f38bd66e, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x20439a0c84b322eb45a3857afc18f5826e8c7382c8a1585c507be199981fd22f, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x2e0ba8d94d9ecf4a94ec2050c7371ff1bb50f27799a84b6d4a2a6f2a0982c887, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := add(0x143fd115ce08fb27ca38eb7cce822b4517822cd2109048d2e6d0ddcca17d71c8, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x0c64cbecb1c734b857968dbbdcf813cdf8611659323dbcbfc84323623be9caf1, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x028a305847c683f646fca925c163ff5ae74f348d62c2b670f1426cef9403da53, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x2e4ef510ff0b6fda5fa940ab4c4380f26a6bcb64d89427b824d6755b5db9e30c, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x0081c95bc43384e663d79270c956ce3b8925b4f6d033b078b96384f50579400e, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x2ed5f0c91cbd9749187e2fade687e05ee2491b349c039a0bba8a9f4023a0bb38, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := add(0x30509991f88da3504bbf374ed5aae2f03448a22c76234c8c990f01f33a735206, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x1c3f20fd55409a53221b7c4d49a356b9f0a1119fb2067b41a7529094424ec6ad, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x10b4e7f3ab5df003049514459b6e18eec46bb2213e8e131e170887b47ddcb96c, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x2a1982979c3ff7f43ddd543d891c2abddd80f804c077d775039aa3502e43adef, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x1c74ee64f15e1db6feddbead56d6d55dba431ebc396c9af95cad0f1315bd5c91, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x07533ec850ba7f98eab9303cace01b4b9e4f2e8b82708cfa9c2fe45a0ae146a0, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := add(0x21576b438e500449a151e4eeaf17b154285c68f42d42c1808a11abf3764c0750, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x2f17c0559b8fe79608ad5ca193d62f10bce8384c815f0906743d6930836d4a9e, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x2d477e3862d07708a79e8aae946170bc9775a4201318474ae665b0b1b7e2730e, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x162f5243967064c390e095577984f291afba2266c38f5abcd89be0f5b2747eab, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x2b4cb233ede9ba48264ecd2c8ae50d1ad7a8596a87f29f8a7777a70092393311, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x2c8fbcb2dd8573dc1dbaf8f4622854776db2eece6d85c4cf4254e7c35e03b07a, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := add(0x1d6f347725e4816af2ff453f0cd56b199e1b61e9f601e9ade5e88db870949da9, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x204b0c397f4ebe71ebc2d8b3df5b913df9e6ac02b68d31324cd49af5c4565529, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x0c4cb9dc3c4fd8174f1149b3c63c3c2f9ecb827cd7dc25534ff8fb75bc79c502, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x174ad61a1448c899a25416474f4930301e5c49475279e0639a616ddc45bc7b54, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x1a96177bcf4d8d89f759df4ec2f3cde2eaaa28c177cc0fa13a9816d49a38d2ef, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x066d04b24331d71cd0ef8054bc60c4ff05202c126a233c1a8242ace360b8a30a, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := add(0x2a4c4fc6ec0b0cf52195782871c6dd3b381cc65f72e02ad527037a62aa1bd804, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x13ab2d136ccf37d447e9f2e14a7cedc95e727f8446f6d9d7e55afc01219fd649, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x1121552fca26061619d24d843dc82769c1b04fcec26f55194c2e3e869acc6a9a, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x00ef653322b13d6c889bc81715c37d77a6cd267d595c4a8909a5546c7c97cff1, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x0e25483e45a665208b261d8ba74051e6400c776d652595d9845aca35d8a397d3, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x29f536dcb9dd7682245264659e15d88e395ac3d4dde92d8c46448db979eeba89, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := add(0x2a56ef9f2c53febadfda33575dbdbd885a124e2780bbea170e456baace0fa5be, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x1c8361c78eb5cf5decfb7a2d17b5c409f2ae2999a46762e8ee416240a8cb9af1, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x151aff5f38b20a0fc0473089aaf0206b83e8e68a764507bfd3d0ab4be74319c5, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x04c6187e41ed881dc1b239c88f7f9d43a9f52fc8c8b6cdd1e76e47615b51f100, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x13b37bd80f4d27fb10d84331f6fb6d534b81c61ed15776449e801b7ddc9c2967, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x01a5c536273c2d9df578bfbd32c17b7a2ce3664c2a52032c9321ceb1c4e8a8e4, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := add(0x2ab3561834ca73835ad05f5d7acb950b4a9a2c666b9726da832239065b7c3b02, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x1d4d8ec291e720db200fe6d686c0d613acaf6af4e95d3bf69f7ed516a597b646, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x041294d2cc484d228f5784fe7919fd2bb925351240a04b711514c9c80b65af1d, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x154ac98e01708c611c4fa715991f004898f57939d126e392042971dd90e81fc6, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x0b339d8acca7d4f83eedd84093aef51050b3684c88f8b0b04524563bc6ea4da4, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x0955e49e6610c94254a4f84cfbab344598f0e71eaff4a7dd81ed95b50839c82e, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := add(0x06746a6156eba54426b9e22206f15abca9a6f41e6f535c6f3525401ea0654626, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x0f18f5a0ecd1423c496f3820c549c27838e5790e2bd0a196ac917c7ff32077fb, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x04f6eeca1751f7308ac59eff5beb261e4bb563583ede7bc92a738223d6f76e13, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x2b56973364c4c4f5c1a3ec4da3cdce038811eb116fb3e45bc1768d26fc0b3758, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x123769dd49d5b054dcd76b89804b1bcb8e1392b385716a5d83feb65d437f29ef, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x2147b424fc48c80a88ee52b91169aacea989f6446471150994257b2fb01c63e9, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := add(0x0fdc1f58548b85701a6c5505ea332a29647e6f34ad4243c2ea54ad897cebe54d, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x12373a8251fea004df68abcf0f7786d4bceff28c5dbbe0c3944f685cc0a0b1f2, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x21e4f4ea5f35f85bad7ea52ff742c9e8a642756b6af44203dd8a1f35c1a90035, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x16243916d69d2ca3dfb4722224d4c462b57366492f45e90d8a81934f1bc3b147, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x1efbe46dd7a578b4f66f9adbc88b4378abc21566e1a0453ca13a4159cac04ac2, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x07ea5e8537cf5dd08886020e23a7f387d468d5525be66f853b672cc96a88969a, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := add(0x05a8c4f9968b8aa3b7b478a30f9a5b63650f19a75e7ce11ca9fe16c0b76c00bc, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x20f057712cc21654fbfe59bd345e8dac3f7818c701b9c7882d9d57b72a32e83f, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x04a12ededa9dfd689672f8c67fee31636dcd8e88d01d49019bd90b33eb33db69, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x27e88d8c15f37dcee44f1e5425a51decbd136ce5091a6767e49ec9544ccd101a, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x2feed17b84285ed9b8a5c8c5e95a41f66e096619a7703223176c41ee433de4d1, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x1ed7cc76edf45c7c404241420f729cf394e5942911312a0d6972b8bd53aff2b8, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := add(0x15742e99b9bfa323157ff8c586f5660eac6783476144cdcadf2874be45466b1a, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x1aac285387f65e82c895fc6887ddf40577107454c6ec0317284f033f27d0c785, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x25851c3c845d4790f9ddadbdb6057357832e2e7a49775f71ec75a96554d67c77, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x15a5821565cc2ec2ce78457db197edf353b7ebba2c5523370ddccc3d9f146a67, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x2411d57a4813b9980efa7e31a1db5966dcf64f36044277502f15485f28c71727, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x002e6f8d6520cd4713e335b8c0b6d2e647e9a98e12f4cd2558828b5ef6cb4c9b, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := add(0x2ff7bc8f4380cde997da00b616b0fcd1af8f0e91e2fe1ed7398834609e0315d2, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x00b9831b948525595ee02724471bcd182e9521f6b7bb68f1e93be4febb0d3cbe, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x0a2f53768b8ebf6a86913b0e57c04e011ca408648a4743a87d77adbf0c9c3512, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x00248156142fd0373a479f91ff239e960f599ff7e94be69b7f2a290305e1198d, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x171d5620b87bfb1328cf8c02ab3f0c9a397196aa6a542c2350eb512a2b2bcda9, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x170a4f55536f7dc970087c7c10d6fad760c952172dd54dd99d1045e4ec34a808, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := add(0x29aba33f799fe66c2ef3134aea04336ecc37e38c1cd211ba482eca17e2dbfae1, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x1e9bc179a4fdd758fdd1bb1945088d47e70d114a03f6a0e8b5ba650369e64973, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x1dd269799b660fad58f7f4892dfb0b5afeaad869a9c4b44f9c9e1c43bdaf8f09, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x22cdbc8b70117ad1401181d02e15459e7ccd426fe869c7c95d1dd2cb0f24af38, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x0ef042e454771c533a9f57a55c503fcefd3150f52ed94a7cd5ba93b9c7dacefd, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x11609e06ad6c8fe2f287f3036037e8851318e8b08a0359a03b304ffca62e8284, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := add(0x1166d9e554616dba9e753eea427c17b7fecd58c076dfe42708b08f5b783aa9af, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x2de52989431a859593413026354413db177fbf4cd2ac0b56f855a888357ee466, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x3006eb4ffc7a85819a6da492f3a8ac1df51aee5b17b8e89d74bf01cf5f71e9ad, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x2af41fbb61ba8a80fdcf6fff9e3f6f422993fe8f0a4639f962344c8225145086, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x119e684de476155fe5a6b41a8ebc85db8718ab27889e85e781b214bace4827c3, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x1835b786e2e8925e188bea59ae363537b51248c23828f047cff784b97b3fd800, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := add(0x28201a34c594dfa34d794996c6433a20d152bac2a7905c926c40e285ab32eeb6, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x083efd7a27d1751094e80fefaf78b000864c82eb571187724a761f88c22cc4e7, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x0b6f88a3577199526158e61ceea27be811c16df7774dd8519e079564f61fd13b, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x0ec868e6d15e51d9644f66e1d6471a94589511ca00d29e1014390e6ee4254f5b, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x2af33e3f866771271ac0c9b3ed2e1142ecd3e74b939cd40d00d937ab84c98591, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x0b520211f904b5e7d09b5d961c6ace7734568c547dd6858b364ce5e47951f178, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := add(0x0b2d722d0919a1aad8db58f10062a92ea0c56ac4270e822cca228620188a1d40, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x1f790d4d7f8cf094d980ceb37c2453e957b54a9991ca38bbe0061d1ed6e562d4, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x0171eb95dfbf7d1eaea97cd385f780150885c16235a2a6a8da92ceb01e504233, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x0c2d0e3b5fd57549329bf6885da66b9b790b40defd2c8650762305381b168873, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x1162fb28689c27154e5a8228b4e72b377cbcafa589e283c35d3803054407a18d, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x2f1459b65dee441b64ad386a91e8310f282c5a92a89e19921623ef8249711bc0, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := add(0x1e6ff3216b688c3d996d74367d5cd4c1bc489d46754eb712c243f70d1b53cfbb, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x01ca8be73832b8d0681487d27d157802d741a6f36cdc2a0576881f9326478875, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x1f7735706ffe9fc586f976d5bdf223dc680286080b10cea00b9b5de315f9650e, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x2522b60f4ea3307640a0c2dce041fba921ac10a3d5f096ef4745ca838285f019, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x23f0bee001b1029d5255075ddc957f833418cad4f52b6c3f8ce16c235572575b, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x2bc1ae8b8ddbb81fcaac2d44555ed5685d142633e9df905f66d9401093082d59, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := add(0x0f9406b8296564a37304507b8dba3ed162371273a07b1fc98011fcd6ad72205f, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x2360a8eb0cc7defa67b72998de90714e17e75b174a52ee4acb126c8cd995f0a8, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x15871a5cddead976804c803cbaef255eb4815a5e96df8b006dcbbc2767f88948, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x193a56766998ee9e0a8652dd2f3b1da0362f4f54f72379544f957ccdeefb420f, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x2a394a43934f86982f9be56ff4fab1703b2e63c8ad334834e4309805e777ae0f, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x1859954cfeb8695f3e8b635dcb345192892cd11223443ba7b4166e8876c0d142, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := add(0x04e1181763050e58013444dbcb99f1902b11bc25d90bbdca408d3819f4fed32b, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x0fdb253dee83869d40c335ea64de8c5bb10eb82db08b5e8b1f5e5552bfd05f23, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x058cbe8a9a5027bdaa4efb623adead6275f08686f1c08984a9d7c5bae9b4f1c0, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x1382edce9971e186497eadb1aeb1f52b23b4b83bef023ab0d15228b4cceca59a, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x03464990f045c6ee0819ca51fd11b0be7f61b8eb99f14b77e1e6634601d9e8b5, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x23f7bfc8720dc296fff33b41f98ff83c6fcab4605db2eb5aaa5bc137aeb70a58, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := add(0x0a59a158e3eec2117e6e94e7f0e9decf18c3ffd5e1531a9219636158bbaf62f2, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x06ec54c80381c052b58bf23b312ffd3ce2c4eba065420af8f4c23ed0075fd07b, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x118872dc832e0eb5476b56648e867ec8b09340f7a7bcb1b4962f0ff9ed1f9d01, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x13d69fa127d834165ad5c7cba7ad59ed52e0b0f0e42d7fea95e1906b520921b1, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x169a177f63ea681270b1c6877a73d21bde143942fb71dc55fd8a49f19f10c77b, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x04ef51591c6ead97ef42f287adce40d93abeb032b922f66ffb7e9a5a7450544d, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := add(0x256e175a1dc079390ecd7ca703fb2e3b19ec61805d4f03ced5f45ee6dd0f69ec, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x30102d28636abd5fe5f2af412ff6004f75cc360d3205dd2da002813d3e2ceeb2, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x10998e42dfcd3bbf1c0714bc73eb1bf40443a3fa99bef4a31fd31be182fcc792, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x193edd8e9fcf3d7625fa7d24b598a1d89f3362eaf4d582efecad76f879e36860, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x18168afd34f2d915d0368ce80b7b3347d1c7a561ce611425f2664d7aa51f0b5d, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x29383c01ebd3b6ab0c017656ebe658b6a328ec77bc33626e29e2e95b33ea6111, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := add(0x10646d2f2603de39a1f4ae5e7771a64a702db6e86fb76ab600bf573f9010c711, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x0beb5e07d1b27145f575f1395a55bf132f90c25b40da7b3864d0242dcb1117fb, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x16d685252078c133dc0d3ecad62b5c8830f95bb2e54b59abdffbf018d96fa336, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x0a6abd1d833938f33c74154e0404b4b40a555bbbec21ddfafd672dd62047f01a, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x1a679f5d36eb7b5c8ea12a4c2dedc8feb12dffeec450317270a6f19b34cf1860, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x0980fb233bd456c23974d50e0ebfde4726a423eada4e8f6ffbc7592e3f1b93d6, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := add(0x161b42232e61b84cbf1810af93a38fc0cece3d5628c9282003ebacb5c312c72b, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x0ada10a90c7f0520950f7d47a60d5e6a493f09787f1564e5d09203db47de1a0b, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x1a730d372310ba82320345a29ac4238ed3f07a8a2b4e121bb50ddb9af407f451, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x2c8120f268ef054f817064c369dda7ea908377feaba5c4dffbda10ef58e8c556, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x1c7c8824f758753fa57c00789c684217b930e95313bcb73e6e7b8649a4968f70, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x2cd9ed31f5f8691c8e39e4077a74faa0f400ad8b491eb3f7b47b27fa3fd1cf77, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := add(0x23ff4f9d46813457cf60d92f57618399a5e022ac321ca550854ae23918a22eea, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x09945a5d147a4f66ceece6405dddd9d0af5a2c5103529407dff1ea58f180426d, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x188d9c528025d4c2b67660c6b771b90f7c7da6eaa29d3f268a6dd223ec6fc630, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x3050e37996596b7f81f68311431d8734dba7d926d3633595e0c0d8ddf4f0f47f, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x15af1169396830a91600ca8102c35c426ceae5461e3f95d89d829518d30afd78, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x1da6d09885432ea9a06d9f37f873d985dae933e351466b2904284da3320d8acc, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := add(0x2796ea90d269af29f5f8acf33921124e4e4fad3dbe658945e546ee411ddaa9cb, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x202d7dd1da0f6b4b0325c8b3307742f01e15612ec8e9304a7cb0319e01d32d60, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x096d6790d05bb759156a952ba263d672a2d7f9c788f4c831a29dace4c0f8be5f, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := add(0x054efa1f65b0fce283808965275d877b438da23ce5b13e1963798cb1447d25a4, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x1b162f83d917e93edb3308c29802deb9d8aa690113b2e14864ccf6e18e4165f1, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x21e5241e12564dd6fd9f1cdd2a0de39eedfefc1466cc568ec5ceb745a0506edc, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := mulmod(scratch1, scratch1, F)
      scratch1 := mulmod(mulmod(state0, state0, F), scratch1, F)
      state0 := mulmod(scratch2, scratch2, F)
      scratch2 := mulmod(mulmod(state0, state0, F), scratch2, F)
      state0 := add(0x1cfb5662e8cf5ac9226a80ee17b36abecb73ab5f87e161927b4349e10e4bdf08, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x0f21177e302a771bbae6d8d1ecb373b62c99af346220ac0129c53f666eb24100, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x1671522374606992affb0dd7f71b12bec4236aede6290546bcef7e1f515c2320, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := mulmod(state1, state1, F)
      state1 := mulmod(mulmod(scratch0, scratch0, F), state1, F)
      scratch0 := mulmod(state2, state2, F)
      state2 := mulmod(mulmod(scratch0, scratch0, F), state2, F)
      scratch0 := add(0x0fa3ec5b9488259c2eb4cf24501bfad9be2ec9e42c5cc8ccd419d2a692cad870, add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)))
      scratch1 := add(0x193c0e04e0bd298357cb266c1506080ed36edce85c648cc085e8c57b1ab54bba, add(add(mulmod(state0, M01, F), mulmod(state1, M11, F)), mulmod(state2, M21, F)))
      scratch2 := add(0x102adf8ef74735a27e9128306dcbc3c99f6f7291cd406578ce14ea2adaba68f8, add(add(mulmod(state0, M02, F), mulmod(state1, M12, F)), mulmod(state2, M22, F)))
      state0 := mulmod(scratch0, scratch0, F)
      scratch0 := mulmod(mulmod(state0, state0, F), scratch0, F)
      state0 := mulmod(scratch1, scratch1, F)
      scratch1 := mulmod(mulmod(state0, state0, F), scratch1, F)
      state0 := mulmod(scratch2, scratch2, F)
      scratch2 := mulmod(mulmod(state0, state0, F), scratch2, F)
      state0 := add(0x0fe0af7858e49859e2a54d6f1ad945b1316aa24bfbdd23ae40a6d0cb70c3eab1, add(add(mulmod(scratch0, M00, F), mulmod(scratch1, M10, F)), mulmod(scratch2, M20, F)))
      state1 := add(0x216f6717bbc7dedb08536a2220843f4e2da5f1daa9ebdefde8a5ea7344798d22, add(add(mulmod(scratch0, M01, F), mulmod(scratch1, M11, F)), mulmod(scratch2, M21, F)))
      state2 := add(0x1da55cc900f0d21f4a3e694391918a1b3c23b2ac773c6b3ef88e2e4228325161, add(add(mulmod(scratch0, M02, F), mulmod(scratch1, M12, F)), mulmod(scratch2, M22, F)))
      scratch0 := mulmod(state0, state0, F)
      state0 := mulmod(mulmod(scratch0, scratch0, F), state0, F)
      scratch0 := mulmod(state1, state1, F)
      state1 := mulmod(mulmod(scratch0, scratch0, F), state1, F)
      scratch0 := mulmod(state2, state2, F)
      state2 := mulmod(mulmod(scratch0, scratch0, F), state2, F)

      mstore(0x0, mod(add(add(mulmod(state0, M00, F), mulmod(state1, M10, F)), mulmod(state2, M20, F)), F))

      return(0, 0x20)
    }
  }
}

// ---- node_modules/@zk-kit/lean-imt.sol/Constants.sol ----
uint256 constant SNARK_SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

// ---- node_modules/@zk-kit/lean-imt.sol/InternalLeanIMT.sol ----
struct LeanIMTData {
    // Tracks the current number of leaves in the tree.
    uint256 size;
    // Represents the current depth of the tree, which can increase as new leaves are inserted.
    uint256 depth;
    // A mapping from each level of the tree to the node value of the last even position at that level.
    // Used for efficient inserts, updates and root calculations.
    mapping(uint256 => uint256) sideNodes;
    // A mapping from leaf values to their respective indices in the tree.
    // This facilitates checks for leaf existence and retrieval of leaf positions.
    mapping(uint256 => uint256) leaves;
}

error WrongSiblingNodes();
error LeafGreaterThanSnarkScalarField();
error LeafCannotBeZero();
error LeafAlreadyExists();
error LeafDoesNotExist();

/// @title Lean Incremental binary Merkle tree.
/// @dev The LeanIMT is an optimized version of the BinaryIMT.
/// This implementation eliminates the use of zeroes, and make the tree depth dynamic.
/// When a node doesn't have the right child, instead of using a zero hash as in the BinaryIMT,
/// the node's value becomes that of its left child. Furthermore, rather than utilizing a static tree depth,
/// it is updated based on the number of leaves in the tree. This approach
/// results in the calculation of significantly fewer hashes, making the tree more efficient.
library InternalLeanIMT {
    /// @dev Inserts a new leaf into the incremental merkle tree.
    /// The function ensures that the leaf is valid according to the
    /// constraints of the tree and then updates the tree's structure accordingly.
    /// @param self: A storage reference to the 'LeanIMTData' struct.
    /// @param leaf: The value of the new leaf to be inserted into the tree.
    /// @return The new hash of the node after the leaf has been inserted.
    function _insert(LeanIMTData storage self, uint256 leaf) internal returns (uint256) {
        if (leaf >= SNARK_SCALAR_FIELD) {
            revert LeafGreaterThanSnarkScalarField();
        } else if (leaf == 0) {
            revert LeafCannotBeZero();
        } else if (_has(self, leaf)) {
            revert LeafAlreadyExists();
        }

        uint256 index = self.size;

        // Cache tree depth to optimize gas
        uint256 treeDepth = self.depth;

        // A new insertion can increase a tree's depth by at most 1,
        // and only if the number of leaves supported by the current
        // depth is less than the number of leaves to be supported after insertion.
        if (2 ** treeDepth < index + 1) {
            ++treeDepth;
        }

        self.depth = treeDepth;

        uint256 node = leaf;

        for (uint256 level = 0; level < treeDepth; ) {
            if ((index >> level) & 1 == 1) {
                node = PoseidonT3.hash([self.sideNodes[level], node]);
            } else {
                self.sideNodes[level] = node;
            }

            unchecked {
                ++level;
            }
        }

        self.size = ++index;

        self.sideNodes[treeDepth] = node;
        self.leaves[leaf] = index;

        return node;
    }

    /// @dev Inserts many leaves into the incremental merkle tree.
    /// The function ensures that the leaves are valid according to the
    /// constraints of the tree and then updates the tree's structure accordingly.
    /// @param self: A storage reference to the 'LeanIMTData' struct.
    /// @param leaves: The values of the new leaves to be inserted into the tree.
    /// @return The root after the leaves have been inserted.
    function _insertMany(LeanIMTData storage self, uint256[] calldata leaves) internal returns (uint256) {
        // Cache tree size to optimize gas
        uint256 treeSize = self.size;

        // Check that all the new values are correct to be added.
        for (uint256 i = 0; i < leaves.length; ) {
            if (leaves[i] >= SNARK_SCALAR_FIELD) {
                revert LeafGreaterThanSnarkScalarField();
            } else if (leaves[i] == 0) {
                revert LeafCannotBeZero();
            } else if (_has(self, leaves[i])) {
                revert LeafAlreadyExists();
            }

            self.leaves[leaves[i]] = treeSize + 1 + i;

            unchecked {
                ++i;
            }
        }

        // Array to save the nodes that will be used to create the next level of the tree.
        uint256[] memory currentLevelNewNodes;

        currentLevelNewNodes = leaves;

        // Cache tree depth to optimize gas
        uint256 treeDepth = self.depth;

        // Calculate the depth of the tree after adding the new values.
        // Unlike the 'insert' function, we need a while here as
        // N insertions can increase the tree's depth more than once.
        while (2 ** treeDepth < treeSize + leaves.length) {
            ++treeDepth;
        }

        self.depth = treeDepth;

        // First index to change in every level.
        uint256 currentLevelStartIndex = treeSize;

        // Size of the level used to create the next level.
        uint256 currentLevelSize = treeSize + leaves.length;

        // The index where changes begin at the next level.
        uint256 nextLevelStartIndex = currentLevelStartIndex >> 1;

        // The size of the next level.
        uint256 nextLevelSize = ((currentLevelSize - 1) >> 1) + 1;

        for (uint256 level = 0; level < treeDepth; ) {
            // The number of nodes for the new level that will be created,
            // only the new values, not the entire level.
            uint256 numberOfNewNodes = nextLevelSize - nextLevelStartIndex;
            uint256[] memory nextLevelNewNodes = new uint256[](numberOfNewNodes);
            for (uint256 i = 0; i < numberOfNewNodes; ) {
                uint256 leftNode;

                // Assign the left node using the saved path or the position in the array.
                if ((i + nextLevelStartIndex) * 2 < currentLevelStartIndex) {
                    leftNode = self.sideNodes[level];
                } else {
                    leftNode = currentLevelNewNodes[(i + nextLevelStartIndex) * 2 - currentLevelStartIndex];
                }

                uint256 rightNode;

                // Assign the right node if the value exists.
                if ((i + nextLevelStartIndex) * 2 + 1 < currentLevelSize) {
                    rightNode = currentLevelNewNodes[(i + nextLevelStartIndex) * 2 + 1 - currentLevelStartIndex];
                }

                uint256 parentNode;

                // Assign the parent node.
                // If it has a right child the result will be the hash(leftNode, rightNode) if not,
                // it will be the leftNode.
                if (rightNode != 0) {
                    parentNode = PoseidonT3.hash([leftNode, rightNode]);
                } else {
                    parentNode = leftNode;
                }

                nextLevelNewNodes[i] = parentNode;

                unchecked {
                    ++i;
                }
            }

            // Update the `sideNodes` variable.
            // If `currentLevelSize` is odd, the saved value will be the last value of the array
            // if it is even and there are more than 1 element in `currentLevelNewNodes`, the saved value
            // will be the value before the last one.
            // If it is even and there is only one element, there is no need to save anything because
            // the correct value for this level was already saved before.
            if (currentLevelSize & 1 == 1) {
                self.sideNodes[level] = currentLevelNewNodes[currentLevelNewNodes.length - 1];
            } else if (currentLevelNewNodes.length > 1) {
                self.sideNodes[level] = currentLevelNewNodes[currentLevelNewNodes.length - 2];
            }

            currentLevelStartIndex = nextLevelStartIndex;

            // Calculate the next level startIndex value.
            // It is the position of the parent node which is pos/2.
            nextLevelStartIndex >>= 1;

            // Update the next array that will be used to calculate the next level.
            currentLevelNewNodes = nextLevelNewNodes;

            currentLevelSize = nextLevelSize;

            // Calculate the size of the next level.
            // The size of the next level is (currentLevelSize - 1) / 2 + 1.
            nextLevelSize = ((nextLevelSize - 1) >> 1) + 1;

            unchecked {
                ++level;
            }
        }

        // Update tree size
        self.size = treeSize + leaves.length;

        // Update tree root
        self.sideNodes[treeDepth] = currentLevelNewNodes[0];

        return currentLevelNewNodes[0];
    }

    /// @dev Updates the value of an existing leaf and recalculates hashes
    /// to maintain tree integrity.
    /// @param self: A storage reference to the 'LeanIMTData' struct.
    /// @param oldLeaf: The value of the leaf that is to be updated.
    /// @param newLeaf: The new value that will replace the oldLeaf in the tree.
    /// @param siblingNodes: An array of sibling nodes that are necessary to recalculate the path to the root.
    /// @return The new hash of the updated node after the leaf has been updated.
    function _update(
        LeanIMTData storage self,
        uint256 oldLeaf,
        uint256 newLeaf,
        uint256[] calldata siblingNodes
    ) internal returns (uint256) {
        if (newLeaf >= SNARK_SCALAR_FIELD) {
            revert LeafGreaterThanSnarkScalarField();
        } else if (!_has(self, oldLeaf)) {
            revert LeafDoesNotExist();
        } else if (_has(self, newLeaf)) {
            revert LeafAlreadyExists();
        }

        uint256 index = _indexOf(self, oldLeaf);
        uint256 node = newLeaf;
        uint256 oldRoot = oldLeaf;

        uint256 lastIndex = self.size - 1;
        uint256 i = 0;

        // Cache tree depth to optimize gas
        uint256 treeDepth = self.depth;

        for (uint256 level = 0; level < treeDepth; ) {
            if ((index >> level) & 1 == 1) {
                if (siblingNodes[i] >= SNARK_SCALAR_FIELD) {
                    revert LeafGreaterThanSnarkScalarField();
                }

                node = PoseidonT3.hash([siblingNodes[i], node]);
                oldRoot = PoseidonT3.hash([siblingNodes[i], oldRoot]);

                unchecked {
                    ++i;
                }
            } else {
                if (index >> level != lastIndex >> level) {
                    if (siblingNodes[i] >= SNARK_SCALAR_FIELD) {
                        revert LeafGreaterThanSnarkScalarField();
                    }

                    node = PoseidonT3.hash([node, siblingNodes[i]]);
                    oldRoot = PoseidonT3.hash([oldRoot, siblingNodes[i]]);

                    unchecked {
                        ++i;
                    }
                } else {
                    self.sideNodes[i] = node;
                }
            }

            unchecked {
                ++level;
            }
        }

        if (oldRoot != _root(self)) {
            revert WrongSiblingNodes();
        }

        self.sideNodes[treeDepth] = node;

        if (newLeaf != 0) {
            self.leaves[newLeaf] = self.leaves[oldLeaf];
        }

        self.leaves[oldLeaf] = 0;

        return node;
    }

    /// @dev Removes a leaf from the tree by setting its value to zero.
    /// This function utilizes the update function to set the leaf's value
    /// to zero and update the tree's state accordingly.
    /// @param self: A storage reference to the 'LeanIMTData' struct.
    /// @param oldLeaf: The value of the leaf to be removed.
    /// @param siblingNodes: An array of sibling nodes required for updating the path to the root after removal.
    /// @return The new root hash of the tree after the leaf has been removed.
    function _remove(
        LeanIMTData storage self,
        uint256 oldLeaf,
        uint256[] calldata siblingNodes
    ) internal returns (uint256) {
        return _update(self, oldLeaf, 0, siblingNodes);
    }

    /// @dev Checks if a leaf exists in the tree.
    /// @param self: A storage reference to the 'LeanIMTData' struct.
    /// @param leaf: The value of the leaf to check for existence.
    /// @return A boolean value indicating whether the leaf exists in the tree.
    function _has(LeanIMTData storage self, uint256 leaf) internal view returns (bool) {
        return self.leaves[leaf] != 0;
    }

    /// @dev Retrieves the index of a given leaf in the tree.
    /// @param self: A storage reference to the 'LeanIMTData' struct.
    /// @param leaf: The value of the leaf whose index is to be found.
    /// @return The index of the specified leaf within the tree. If the leaf is not present, the function
    /// reverts with a custom error.
    function _indexOf(LeanIMTData storage self, uint256 leaf) internal view returns (uint256) {
        if (self.leaves[leaf] == 0) {
            revert LeafDoesNotExist();
        }

        return self.leaves[leaf] - 1;
    }

    /// @dev Retrieves the root of the tree from the 'sideNodes' mapping using the
    /// current tree depth.
    /// @param self: A storage reference to the 'LeanIMTData' struct.
    /// @return The root hash of the tree.
    function _root(LeanIMTData storage self) internal view returns (uint256) {
        return self.sideNodes[self.depth];
    }
}

// ---- vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/contracts/State.sol ----
/*

Made with ♥ for 0xBow by

░██╗░░░░░░░██╗░█████╗░███╗░░██╗██████╗░███████╗██████╗░██╗░░░░░░█████╗░███╗░░██╗██████╗░
░██║░░██╗░░██║██╔══██╗████╗░██║██╔══██╗██╔════╝██╔══██╗██║░░░░░██╔══██╗████╗░██║██╔══██╗
░╚██╗████╗██╔╝██║░░██║██╔██╗██║██║░░██║█████╗░░██████╔╝██║░░░░░███████║██╔██╗██║██║░░██║
░░████╔═████║░██║░░██║██║╚████║██║░░██║██╔══╝░░██╔══██╗██║░░░░░██╔══██║██║╚████║██║░░██║
░░╚██╔╝░╚██╔╝░╚█████╔╝██║░╚███║██████╔╝███████╗██║░░██║███████╗██║░░██║██║░╚███║██████╔╝
░░░╚═╝░░░╚═╝░░░╚════╝░╚═╝░░╚══╝╚═════╝░╚══════╝╚═╝░░╚═╝╚══════╝╚═╝░░╚═╝╚═╝░░╚══╝╚═════╝░

https://defi.sucks

*/








/**
 * @title State
 * @notice Base contract for the managing the state of a Privacy Pool
 * @custom:semver 0.1.0
 */
abstract contract State is IState {
  using InternalLeanIMT for LeanIMTData;

  /// @inheritdoc IState
  uint32 public constant ROOT_HISTORY_SIZE = 64;
  /// @inheritdoc IState
  uint32 public constant MAX_TREE_DEPTH = 32;

  /// @inheritdoc IState
  address public immutable ASSET;
  /// @inheritdoc IState
  uint256 public immutable SCOPE;
  /// @inheritdoc IState
  IEntrypoint public immutable ENTRYPOINT;
  /// @inheritdoc IState
  IVerifier public immutable WITHDRAWAL_VERIFIER;
  /// @inheritdoc IState
  IVerifier public immutable RAGEQUIT_VERIFIER;

  /// @inheritdoc IState
  uint256 public nonce;
  /// @inheritdoc IState
  bool public dead;

  /// @inheritdoc IState
  mapping(uint256 _index => uint256 _root) public roots;
  /// @inheritdoc IState
  uint32 public currentRootIndex;

  // @notice The state merkle tree containing all commitments
  LeanIMTData internal _merkleTree;

  /// @inheritdoc IState
  mapping(uint256 _nullifierHash => bool _spent) public nullifierHashes;
  /// @inheritdoc IState
  mapping(uint256 _label => address _depositooor) public depositors;

  /**
   * @notice Check the caller is the Entrypoint
   */
  modifier onlyEntrypoint() {
    if (msg.sender != address(ENTRYPOINT)) revert OnlyEntrypoint();
    _;
  }

  /**
   * @notice Initialize the state addresses
   */
  constructor(address _asset, address _entrypoint, address _withdrawalVerifier, address _ragequitVerifier) {
    // Sanitize initial addresses
    if (_asset == address(0)) revert ZeroAddress();
    if (_entrypoint == address(0)) revert ZeroAddress();
    if (_ragequitVerifier == address(0)) revert ZeroAddress();
    if (_withdrawalVerifier == address(0)) revert ZeroAddress();

    // Store asset address
    ASSET = _asset;
    // Compute SCOPE
    SCOPE = uint256(keccak256(abi.encodePacked(address(this), block.chainid, _asset))) % Constants.SNARK_SCALAR_FIELD;

    ENTRYPOINT = IEntrypoint(_entrypoint);
    WITHDRAWAL_VERIFIER = IVerifier(_withdrawalVerifier);
    RAGEQUIT_VERIFIER = IVerifier(_ragequitVerifier);
  }

  /*///////////////////////////////////////////////////////////////
                              VIEWS
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IState
  function currentRoot() external view returns (uint256 _root) {
    _root = _merkleTree._root();
  }

  /// @inheritdoc IState
  function currentTreeDepth() external view returns (uint256 _depth) {
    _depth = _merkleTree.depth;
  }

  /// @inheritdoc IState
  function currentTreeSize() external view returns (uint256 _size) {
    _size = _merkleTree.size;
  }

  /*///////////////////////////////////////////////////////////////
                        INTERNAL METHODS
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Spends a nullifier hash
   * @param _nullifierHash The nullifier hash to spend
   */
  function _spend(uint256 _nullifierHash) internal {
    // Check if the nullifier is already spent
    if (nullifierHashes[_nullifierHash]) revert NullifierAlreadySpent();

    // Mark as spent
    nullifierHashes[_nullifierHash] = true;
  }

  /**
   * @notice Insert a leaf into the state
   * @param _leaf The leaf to insert
   * @return _updatedRoot The new root after inserting the leaf
   */
  function _insert(uint256 _leaf) internal returns (uint256 _updatedRoot) {
    // Insert leaf in the tree
    _updatedRoot = _merkleTree._insert(_leaf);

    if (_merkleTree.depth > MAX_TREE_DEPTH) revert MaxTreeDepthReached();

    // Calculate the next index
    uint32 nextIndex = (currentRootIndex + 1) % ROOT_HISTORY_SIZE;

    // Store the root at the next index
    roots[nextIndex] = _updatedRoot;

    // Update currentRootIndex to point to the latest root
    currentRootIndex = nextIndex;

    emit LeafInserted(_merkleTree.size, _leaf, _updatedRoot);
  }

  /**
   * @notice Returns whether the root is a known root
   * @dev A circular buffer is used for root storage to decrease the cost of storing new roots
   * @dev Optimized to start search from most recent roots, improving average case performance
   * @param _root The root to check
   * @return Returns true if the root exists in the history, false otherwise
   */
  function _isKnownRoot(uint256 _root) internal view returns (bool) {
    if (_root == 0) return false;

    // Start from the most recent root (current index)
    uint32 _index = currentRootIndex;

    // Check all possible roots in the history
    for (uint32 _i = 0; _i < ROOT_HISTORY_SIZE; _i++) {
      if (_root == roots[_index]) return true;
      _index = (_index + ROOT_HISTORY_SIZE - 1) % ROOT_HISTORY_SIZE;
    }
    return false;
  }

  /**
   * @notice Returns whether a leaf is in the state
   * @param _leaf The leaf to check
   * @return Returns true if the leaf exists in the tree, false otherwise
   */
  function _isInState(uint256 _leaf) internal view returns (bool) {
    return _merkleTree._has(_leaf);
  }
}

// ---- vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/contracts/PrivacyPool.sol ----
/*

Made with ♥ for 0xBow by

░██╗░░░░░░░██╗░█████╗░███╗░░██╗██████╗░███████╗██████╗░██╗░░░░░░█████╗░███╗░░██╗██████╗░
░██║░░██╗░░██║██╔══██╗████╗░██║██╔══██╗██╔════╝██╔══██╗██║░░░░░██╔══██╗████╗░██║██╔══██╗
░╚██╗████╗██╔╝██║░░██║██╔██╗██║██║░░██║█████╗░░██████╔╝██║░░░░░███████║██╔██╗██║██║░░██║
░░████╔═████║░██║░░██║██║╚████║██║░░██║██╔══╝░░██╔══██╗██║░░░░░██╔══██║██║╚████║██║░░██║
░░╚██╔╝░╚██╔╝░╚█████╔╝██║░╚███║██████╔╝███████╗██║░░██║███████╗██║░░██║██║░╚███║██████╔╝
░░░╚═╝░░░╚═╝░░░╚════╝░╚═╝░░╚══╝╚═════╝░╚══════╝╚═╝░░╚═╝╚══════╝╚═╝░░╚═╝╚═╝░░╚══╝╚═════╝░

https://defi.sucks/

*/










/**
 * @title PrivacyPool
 * @notice Allows publicly depositing and privately withdrawing funds.
 * @dev Withdrawals require a valid proof of being approved by an ASP.
 * @dev Deposits can be irreversibly suspended by the Entrypoint, while withdrawals can't.
 */
abstract contract PrivacyPool is State, IPrivacyPool {
  using ProofLib for ProofLib.WithdrawProof;
  using ProofLib for ProofLib.RagequitProof;

  uint256 public constant DEPOSIT_DENOMINATION = 0.001 ether;
  uint256 public constant LIFETIME_DEPOSIT_CAP = 10 ether;
  address public guardian;
  bool public depositsPaused;
  uint256 public lifetimeDeposited;

  event DepositsPaused(address indexed guardian);
  event GuardianRenounced(address indexed guardian);

  error DepositsArePaused();
  error InvalidDenomination();
  error PoolDepositCapExceeded();
  error NotGuardian();

  /**
   * @notice Does a series of sanity checks on the proof public signals
   * @param _withdrawal The withdrawal data structure containing withdrawal details
   * @param _proof The withdrawal proof data structure containing proof details
   */
  modifier validWithdrawal(Withdrawal memory _withdrawal, ProofLib.WithdrawProof memory _proof) {
    // Check caller is the allowed processooor
    if (msg.sender != _withdrawal.processooor) revert InvalidProcessooor();

    // Check the context matches to ensure its integrity
    if (_proof.context() != uint256(keccak256(abi.encode(_withdrawal, SCOPE))) % Constants.SNARK_SCALAR_FIELD) {
      revert ContextMismatch();
    }

    // Check the tree depth signals are less than the max tree depth
    if (_proof.stateTreeDepth() > MAX_TREE_DEPTH || _proof.ASPTreeDepth() > MAX_TREE_DEPTH) revert InvalidTreeDepth();

    // Check the state root is known
    if (!_isKnownRoot(_proof.stateRoot())) revert UnknownStateRoot();

    // Check the ASP root is the latest
    if (_proof.ASPRoot() != ENTRYPOINT.latestRoot()) revert IncorrectASPRoot();
    _;
  }

  /**
   * @notice Initializes the contract state addresses
   * @param _entrypoint Address of the Entrypoint that operates this pool
   * @param _withdrawalVerifier Address of the Groth16 verifier for withdrawal proofs
   * @param _ragequitVerifier Address of the Groth16 verifier for ragequit proofs
   * @param _asset Address of the pool asset
   */
  constructor(
    address _entrypoint,
    address _withdrawalVerifier,
    address _ragequitVerifier,
    address _asset
  ) State(_asset, _entrypoint, _withdrawalVerifier, _ragequitVerifier) {}

  /*///////////////////////////////////////////////////////////////
                             USER METHODS 
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IPrivacyPool
  function deposit(
    address _depositor,
    uint256 _value,
    uint256 _precommitmentHash
  ) external payable onlyEntrypoint returns (uint256 _commitment) {
    // Check deposits are enabled
    if (dead) revert PoolIsDead();
    if (depositsPaused) revert DepositsArePaused();
    if (_value != DEPOSIT_DENOMINATION) revert InvalidDenomination();
    if (lifetimeDeposited + _value > LIFETIME_DEPOSIT_CAP) revert PoolDepositCapExceeded();

    if (_value >= type(uint128).max) revert InvalidDepositValue();
    lifetimeDeposited += _value;

    // Compute label
    uint256 _label = uint256(keccak256(abi.encodePacked(SCOPE, ++nonce))) % Constants.SNARK_SCALAR_FIELD;
    // Store depositor
    depositors[_label] = _depositor;

    // Compute commitment hash
    _commitment = PoseidonT4.hash([_value, _label, _precommitmentHash]);

    // Insert commitment in state (revert if already present)
    _insert(_commitment);

    // Pull funds from caller
    _pull(msg.sender, _value);

    emit Deposited(_depositor, _commitment, _label, _value, _precommitmentHash);
  }

  /// @inheritdoc IPrivacyPool
  function withdraw(
    Withdrawal memory _withdrawal,
    ProofLib.WithdrawProof memory _proof
  ) external validWithdrawal(_withdrawal, _proof) {
    if (_proof.withdrawnValue() != DEPOSIT_DENOMINATION) revert InvalidDenomination();
    // Verify proof with Groth16 verifier
    if (!WITHDRAWAL_VERIFIER.verifyProof(_proof.pA, _proof.pB, _proof.pC, _proof.pubSignals)) revert InvalidProof();

    // Mark existing commitment nullifier as spent
    _spend(_proof.existingNullifierHash());

    // Insert new commitment in state
    _insert(_proof.newCommitmentHash());

    // Transfer out funds to procesooor
    _push(_withdrawal.processooor, _proof.withdrawnValue());

    emit Withdrawn(
      _withdrawal.processooor, _proof.withdrawnValue(), _proof.existingNullifierHash(), _proof.newCommitmentHash()
    );
  }

  /// @inheritdoc IPrivacyPool
  function ragequit(ProofLib.RagequitProof memory _proof) external {
    if (_proof.value() != DEPOSIT_DENOMINATION) revert InvalidDenomination();
    // Check if caller is original depositor
    uint256 _label = _proof.label();
    if (depositors[_label] != msg.sender) revert OnlyOriginalDepositor();

    // Verify proof with Groth16 verifier
    if (!RAGEQUIT_VERIFIER.verifyProof(_proof.pA, _proof.pB, _proof.pC, _proof.pubSignals)) revert InvalidProof();

    // Check commitment exists in state
    if (!_isInState(_proof.commitmentHash())) revert InvalidCommitment();

    // Mark existing commitment nullifier as spent
    _spend(_proof.nullifierHash());

    // Transfer out funds to ragequitter
    _push(msg.sender, _proof.value());

    emit Ragequit(msg.sender, _proof.commitmentHash(), _proof.label(), _proof.value());
  }

  /*///////////////////////////////////////////////////////////////
                             WIND DOWN
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IPrivacyPool
  function windDown() external onlyEntrypoint {
    // Check pool is still alive
    if (dead) revert PoolIsDead();

    // Die
    dead = true;

    emit PoolDied();
  }

  /// @notice Irreversibly stops deposits while preserving withdrawals and ragequit.
  function pauseDeposits() external {
    if (msg.sender != guardian || guardian == address(0)) revert NotGuardian();
    depositsPaused = true;
    emit DepositsPaused(msg.sender);
  }

  /// @notice Permanently gives up the guardian pause authority.
  function renounceGuardian() external {
    if (msg.sender != guardian || guardian == address(0)) revert NotGuardian();
    address previousGuardian = guardian;
    guardian = address(0);
    emit GuardianRenounced(previousGuardian);
  }

  /*///////////////////////////////////////////////////////////////
                          ASSET OVERRIDES
  //////////////////////////////////////////////////////////////*/

  /**
   * @notice Handle receiving an asset
   * @dev To be implemented by an asset specific contract
   * @param _sender The address of the user sending funds
   * @param _value The amount of asset being received
   */
  function _pull(address _sender, uint256 _value) internal virtual;

  /**
   * @notice Handle sending an asset
   * @dev To be implemented by an asset specific contract
   * @param _recipient The address of the user receiving funds
   * @param _value The amount of asset being sent
   */
  function _push(address _recipient, uint256 _value) internal virtual;
}

// ---- vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/contracts/implementations/PrivacyPoolSimple.sol ----
/*

Made with ♥ for 0xBow by

░██╗░░░░░░░██╗░█████╗░███╗░░██╗██████╗░███████╗██████╗░██╗░░░░░░█████╗░███╗░░██╗██████╗░
░██║░░██╗░░██║██╔══██╗████╗░██║██╔══██╗██╔════╝██╔══██╗██║░░░░░██╔══██╗████╗░██║██╔══██╗
░╚██╗████╗██╔╝██║░░██║██╔██╗██║██║░░██║█████╗░░██████╔╝██║░░░░░███████║██╔██╗██║██║░░██║
░░████╔═████║░██║░░██║██║╚████║██║░░██║██╔══╝░░██╔══██╗██║░░░░░██╔══██║██║╚████║██║░░██║
░░╚██╔╝░╚██╔╝░╚█████╔╝██║░╚███║██████╔╝███████╗██║░░██║███████╗██║░░██║██║░╚███║██████╔╝
░░░╚═╝░░░╚═╝░░░╚════╝░╚═╝░░╚══╝╚═════╝░╚══════╝╚═╝░░╚═╝╚══════╝╚═╝░░╚═╝╚═╝░░╚══╝╚═════╝░

https://defi.sucks/

*/






/**
 * @title PrivacyPoolSimple
 * @notice Native asset implementation of Privacy Pool.
 */
contract PrivacyPoolSimple is PrivacyPool, IPrivacyPoolSimple {
  // @notice Initializes the state addresses
  constructor(
    address _entrypoint,
    address _withdrawalVerifier,
    address _ragequitVerifier,
    address _guardian
  ) PrivacyPool(_entrypoint, _withdrawalVerifier, _ragequitVerifier, Constants.NATIVE_ASSET) {
    require(_guardian != address(0), 'zero guardian');
    guardian = _guardian;
  }

  /**
   * @notice Handle receiving native asset asset
   * @param _amount The amount of asset receiving
   * @inheritdoc PrivacyPool
   */
  function _pull(address, uint256 _amount) internal override(PrivacyPool) {
    // Check the amount matches the value sent
    if (msg.value != _amount) revert InsufficientValue();
  }

  /**
   * @notice Handle sending native asset
   * @param _recipient The address of the user receiving the asset
   * @param _amount The amount of native asset being sent
   * @inheritdoc PrivacyPool
   */
  function _push(address _recipient, uint256 _amount) internal override(PrivacyPool) {
    /// Try to send native asset to recipient
    (bool _success,) = _recipient.call{value: _amount}('');
    if (!_success) revert FailedToSendNativeAsset();
  }
}

// ---- contracts/ArtemisMainnetPrivacyPoolSimple.sol ----
/// @notice Mainnet deployment variant that cannot accept deposits until the guardian explicitly activates it.
/// @dev Keeps the pinned 0xbow withdrawal, verifier, and pool logic; only the initial pause state differs.
contract ArtemisMainnetPrivacyPoolSimple is PrivacyPoolSimple {
  bool public activationPending = true;

  error ActivationAlreadyCompleted();

  event DepositsActivated(address indexed guardian);

  constructor(address entrypoint, address withdrawalVerifier, address ragequitVerifier, address guardian)
    PrivacyPoolSimple(entrypoint, withdrawalVerifier, ragequitVerifier, guardian)
  {
    depositsPaused = true;
  }

  /// @notice Opens deposits once after the mainnet deployment and configuration checks are complete.
  function activateDeposits() external {
    if (msg.sender != guardian) revert NotGuardian();
    if (!activationPending) revert ActivationAlreadyCompleted();

    activationPending = false;
    depositsPaused = false;
    emit DepositsActivated(msg.sender);
  }
}