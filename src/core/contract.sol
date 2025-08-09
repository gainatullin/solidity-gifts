// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CryptoGift {
    struct Gift {
        address from;
        address to;
        uint256 amount;
        string message;
        bool claimed;
        uint256 timestamp;
    }

    mapping(uint256 => Gift) public gifts;
    uint256 public giftCounter;

    event GiftSent(
        uint256 indexed giftId,
        address indexed from,
        address indexed to,
        uint256 amount,
        string message
    );

    event GiftClaimed(
        uint256 indexed giftId,
        address indexed claimer,
        uint256 amount
    );

    // Send gift
    function sendGift(address to, string memory message) public payable {
        require(msg.value > 0, "Gift amount must be greater than 0");
        require(to != address(0), "Invalid recipient address");
        require(to != msg.sender, "Cannot send gift to yourself");
        require(bytes(message).length > 0, "Message cannot be empty");
        require(bytes(message).length <= 280, "Message too long (max 280 characters)");

        giftCounter++;

        gifts[giftCounter] = Gift({
            from: msg.sender,
            to: to,
            amount: msg.value,
            message: message,
            claimed: false,
            timestamp: block.timestamp
        });

        emit GiftSent(giftCounter, msg.sender, to, msg.value, message);
    }

    // Get gift
    function claimGift(uint256 giftId) public {
        require(giftId > 0 && giftId <= giftCounter, "Invalid gift ID");

        Gift storage gift = gifts[giftId];
        require(gift.to == msg.sender, "You are not the recipient of this gift");
        require(!gift.claimed, "Gift already claimed");
        require(gift.amount > 0, "Gift has no value");

        gift.claimed = true;

        // Send ETH to receiver
        (bool success, ) = payable(msg.sender).call{value: gift.amount}("");
        require(success, "Failed to send ETH");

        emit GiftClaimed(giftId, msg.sender, gift.amount);
    }

    // Get info about a gift
    function getGift(uint256 giftId) public view returns (
        address from,
        address to,
        uint256 amount,
        string memory message,
        bool claimed,
        uint256 timestamp
    ) {
        require(giftId > 0 && giftId <= giftCounter, "Invalid gift ID");

        Gift memory gift = gifts[giftId];
        return (
            gift.from,
            gift.to,
            gift.amount,
            gift.message,
            gift.claimed,
            gift.timestamp
        );
    }

    // Get sent gifts
    function getSentGifts(address sender) public view returns (uint256[] memory) {
        uint256[] memory sentGifts = new uint256[](giftCounter);
        uint256 count = 0;

        for (uint256 i = 1; i <= giftCounter; i++) {
            if (gifts[i].from == sender) {
                sentGifts[count] = i;
                count++;
            }
        }

        // Create array
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = sentGifts[i];
        }

        return result;
    }

    // Get received gifts
    function getReceivedGifts(address recipient) public view returns (uint256[] memory) {
        uint256[] memory receivedGifts = new uint256[](giftCounter);
        uint256 count = 0;

        for (uint256 i = 1; i <= giftCounter; i++) {
            if (gifts[i].to == recipient) {
                receivedGifts[count] = i;
                count++;
            }
        }

        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = receivedGifts[i];
        }

        return result;
    }

    // Check can user claim gift
    function canClaimGift(uint256 giftId, address user) public view returns (bool) {
        if (giftId == 0 || giftId > giftCounter) return false;

        Gift memory gift = gifts[giftId];
        return gift.to == user && !gift.claimed && gift.amount > 0;
    }

    // Get contracts stats
    function getStats() public view returns (
        uint256 totalGifts,
        uint256 totalValue,
        uint256 claimedGifts,
        uint256 unclaimedGifts
    ) {
        uint256 claimed = 0;
        uint256 totalVal = 0;

        for (uint256 i = 1; i <= giftCounter; i++) {
            totalVal += gifts[i].amount;
            if (gifts[i].claimed) {
                claimed++;
            }
        }

        return (
            giftCounter,
            totalVal,
            claimed,
            giftCounter - claimed
        );
    }
}
