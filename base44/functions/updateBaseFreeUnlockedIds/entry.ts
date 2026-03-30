import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const UNLOCKED_IDS = {
  "Instagram": ["69caea8f885d9c4a7b505461","69cae43228412b956a0a438f","69cae11761ad6cc77f0cfee9","69cadb6421a520611df70919","69c148ba6d1c0035cf02d1a9","69c146bdfab60ed576294858","69c1453791d4594547bfee11","69c1435eab742fd6e008cd58","69c141c950ca2dd967a85fac"],
  "Veloci": ["69c40484123feec4930c882b","69c3fe84eef73d98efe93aa6","69c3f2469acc58465513a165","69c3f18e2dcf9ad9f0bcf19d","69bee40fdf010df68ad11185","69bee3a047ece7215b7dd4c1","69bee3598f82908be678b968","69bee30f2eab3dc69049674e","69bee2be7c13fabf21de2ca9"],
  "Inverno": ["69b83f04c8b652399b19b36e","69b83e6d66ec6633f17dd51f","69b83d25c6c7f4f18d0bc819","69b5b99d8f3cd725b5308656","69b5b8f22011d64e096243e0","69b5b70166fdaab0cd0e15b4","69b2f46d912e399afd24c482","69b2f420764b9233a753fe1d","69b2f3ddf5057410a6054c7d"],
  "Primavera": ["69bd801578fe0e4a2c35c926","69bd7f9e1b594d03261497ac","69bd7f302c9e67d80e6fe582","69bd7d2eadcc133889d95104","69bd74f99c29ea6d0a589f3d","69bae70b2c99399691319a54","69bae68438a45a159570241b","69bae5d09c0169d073996b45","69bae562f3513bb268510c65"],
  "Capodanno": [],
  "Natale": [],
  "Dal mondo": ["69b991f2398b3b98f4c250ba","69b9912edcc80a1d49de1a5a","69b98da8cbfad64dea12f557","69b98d158401ad7cdd7d176f","69b98c72a2d4e8f3a847abf2","69b986f303014e219a548ef8","69b9868ab1dddc5020b689b1","69b98562da8750875c725816","69b984c92f43ff43e6594a48"],
  "Estate": ["69c9a4b180ab7f75f553cdcb","69c9a42de1e1a52d0d20ba9d","69c9a2ce8b1de892584f30ca","69c9a256f8c671e276410bbc","69bae459837829486c7f6b88","69bae3c33881146a49ac8a84","69bae35a50119b5d2e6b44e3","69b84104350bda1f67cdb6fd","69b84071bcab95665d498931"],
  "Autunno": ["69bae9dd99e01b8e67c6b091","69bae97ff0875cf4ca2bbabd","69bae8ba78d18b97e017c08f","69bae80f022914470c125749","69b8523b7e71b4d2aafa1a6f","69b2fb8325b9703e2bf9db79","69b2faac1353c00a4b2d412b","69b2fa529f7ba9a78cf1a3ca","69b2f9e741ea931ce96b9f59"],
  "Low carb": ["69c5384506d4f925b09ce3ab","69c5374edf6cf380cce67fea","69c5365b6b81c8ef56104e32","69c535b343791cd1d967a0d8","69c5350c4f392ba39ff6a9c8","69bc459bc1a9b71b82bb2b3b","69bc4497ff53ad56a3b8e26d","69bc43e8c9c34e6557077401","69bc436050155f850294582a"],
  "Diabete": ["69c52efcdc001b6efb5e1e73","69c52d6c962c64407534ccd6","69c52c5d75d7f7597196292d","69c52bbdd74756af3aa20572","69bee8ba998b79fe0cc96948","69bee8305fa0dc07ec43001a","69bee7b925ce8fc85680320c","69bee74c0a5a3b4b610a46cb","69baec2d6b3a4ca85c4eba13"],
  "Fitness": [],
  "Fit": ["69c4122d2a7a9a8ea1f60557","69c411939946fbf366a5a0d0","69c41104d55696f19101abf9","69c4106e02a209cafb9abd87","69c41000755743dc12237765","69c15e1a64d22388602fd6b1","69c15d97294f585de1a72bc9","69c15d005f9c96fa11bdfb59","69c15c25fa3b2cd366dad4cd"],
  "Detox": ["69c52aac24d7d7cd4fcf7615","69c52a3f31a54e657de4cdee","69c5230deb276a46704c1499","69c52285effc705e956b89cb","69c52206c2c44f9dc5229402","69b1a2798f311a819d2ac42b","69b1a1e4c9b8bfda081b716b","69ad89d7c553368fd811046d","69ad8982e21dfded2fb8d18d"],
  "Vegan": [],
  "Vegetariano": [],
  "Leggera": ["69b81c5ff588e2d782efdefa","69b81bcb83ad49702b0c5eeb","69b81ae2c728f7d4a91468d8","69b436504e78638f3ad2feca","69b434f7dd09fb611d0a159b","69b43492988b18c0cf4bd48a","69b192fd82a6a341219c890f","69b18dff9c54cf029debf863","69b18c19d9b2016ded400c1f"],
  "Dolci": ["69bee69d3de345c2522620fa","69bee5f40d7e8d4458ff4cc8","69bee58bc312930ba4fae620","69bee53abfb2618a6b04539d","69bee4e52c9b9de4ce872c4d","69bc41c44f08312067c6f16b","69bc411baf6f0ed9ed2d8417","69bc40685df5464e18f6b79c","69bc4017c54710c604b44f53"],
  "Proteiche": ["69c533335ef39af7da2996f8","69c53280319135f21a067ec4","69c5320b623e8af747119831","69bc4807d96dcba4d21cf6a7","69bc47c5046054434f63cf8c","69bc475c383d621b47ce5923","69bc46e36c9dd3a865c84cf9","69bc467eb5127ac042b044c9"],
  "Senza zucchero": ["69c415c88d0fff9ea743e162","69c4154f36fd416c08e78067","69c414ad8c0f893d4cfde8d9","69c4141f8d3e874207afa4d0","69c4138a47565236a73695d0","69c162f67d764308369e701c","69c16252859959cbe06fdbf3","69c161aea6bac851f70a566c","69c16107d9458f6da7cf4d90"]
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admin can call this
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    // Update AppConfig
    await base44.asServiceRole.entities.AppConfig.update("69caeb6394b4627f0bd75616", {
      value: JSON.stringify(UNLOCKED_IDS)
    });

    return Response.json({ success: true, message: "AppConfig updated successfully" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});