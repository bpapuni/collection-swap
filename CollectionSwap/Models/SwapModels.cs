﻿using CollectionSwap.Models;
using Microsoft.AspNet.Identity;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Data.Entity;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;

namespace CollectionSwap.Models
{
    public class FindSwapsViewModel
    {
        public List<ApplicationUser> Users { get; set; }
        public List<Collection> Collections { get; set; }
        public List<UserCollection> UserCollections { get; set; }
        public List<Swap> OfferedSwaps { get; set; }
        public List<Swap> AcceptedSwaps { get; set; }
        public List<Swap> ConfirmedSwaps { get; set; }
        public List<Feedback> Feedbacks { get; set; }
    }

    public class SwapViewModel
    {
        public int Id { get; set; }
        public string SenderId { get; set; }
        public string ReceiverId { get; set; }
        public int CollectionId { get; set; }
        public List<string> ItemList { get; set; }
        public int SenderCollectionId { get; set; }
        public int ReceiverCollectionId { get; set; }
        public List<int> SenderItemIds { get; set; }
        public List<int> ReceiverItemIds { get; set; }
        public List<int> RequestedItems { get; set; }
        public double SenderRating { get; set; }
        public double ReceiverRating { get; set; }
        public int SwapSize { get; set; }
        public string Status { get; set; }
        [ForeignKey("SenderId")]
        public ApplicationUser Sender { get; set; }
        [ForeignKey("ReceiverId")]
        public ApplicationUser Receiver { get; set; }
    }

    public class SwapHistoryViewModel
    {
        public List<Swap> Swaps { get; set; }
        public FeedbackViewModel Feedback { get; set; }
        public SwapViewModel Offer { get; set; }
    }

    public class Swap
    {
        [Key]
        public int Id { get; set; }
        [Required]
        public int CollectionId { get; set; }
        [Required]
        public int SenderUserCollectionId { get; set; }
        [Required]
        public int ReceiverUserCollectionId { get; set; }
        [Required]
        public string SenderId { get; set; }
        [Required]
        public string ReceiverId { get; set; }
        [Required]
        public string SenderItemIdsJSON { get; set; }
        [Required]
        public string ReceiverItemIdsJSON { get; set; }
        [Required]
        public string Status { get; set; }
        [Required]
        public bool SenderConfirmSent { get; set; }
        [Required]
        public bool ReceiverConfirmSent { get; set; }
        [Required]
        public bool SenderConfirmReceieved { get; set; }
        [Required]
        public bool ReceiverConfirmReceieved { get; set; }
        [Required]
        public DateTimeOffset StartDate { get; set; }
        public DateTimeOffset? EndDate { get; set; }
        [ForeignKey("SenderId")]
        public ApplicationUser Sender { get; set; }
        [ForeignKey("ReceiverId")]
        public ApplicationUser Receiver { get; set; }
        [ForeignKey("CollectionId")]
        public Collection Collection { get; set; }
        public class ProcessSwapResult
        {
            public bool Succeeded { get; set; }
            public string SuccessType { get; set; }
            public string Error { get; set; }
        }

        public async Task<ProcessSwapResult> ProcessAsync(string userId, SwapRequestViewModel request, ApplicationDbContext db)
        {
            try
            {
                string response = string.Empty;
                switch (request.Status)
                {
                    case "offered":
                        this.CollectionId = request.CollectionId;
                        this.SenderUserCollectionId = request.SenderUserCollectionId;
                        this.ReceiverUserCollectionId = request.ReceiverUserCollectionId;
                        this.SenderId = userId;
                        this.ReceiverId = request.ReceiverId;
                        this.SenderItemIdsJSON = request.SenderItems;
                        this.ReceiverItemIdsJSON = request.RequestedItems;
                        this.Status = request.Status;
                        this.StartDate = request.StartDate;

                        db.Swaps.Add(this);
                        await db.SaveChangesAsync();
                        return new ProcessSwapResult { Succeeded = true, SuccessType = "offered" };

                    case "accepted":
                        this.SenderItemIdsJSON = request.SenderItems;
                        this.Status = request.Status;
                        db.Entry(this).State = EntityState.Modified;

                        HoldItems(this.ReceiverItemIdsJSON, db.UserCollections.Find(this.ReceiverUserCollectionId), this, db);
                        await db.SaveChangesAsync();
                        return new ProcessSwapResult { Succeeded = true, SuccessType = "accepted" };

                    case "confirmed":
                        this.ReceiverItemIdsJSON = request.RequestedItems;
                        this.Status = request.Status;
                        db.Entry(this).State = EntityState.Modified;

                        HoldItems(this.SenderItemIdsJSON, db.UserCollections.Find(this.SenderUserCollectionId), this, db);
                        await db.SaveChangesAsync();
                        return new ProcessSwapResult { Succeeded = true, SuccessType = "confirmed" };

                    //case "declined":
                    //    ReleaseItems(this, db);

                    //    db.Entry(this).State = EntityState.Modified;
                    //    db.Swaps.Remove(this);
                    //    db.SaveChanges();

                    //    response = $"Swap declined.";
                    //    break;
                    default:
                        break;
                }

                return new ProcessSwapResult { Succeeded = false };
            }
            catch (Exception ex)
            {
                return new ProcessSwapResult { Succeeded = false, Error = ex.Message };
            }
        }
        public void Confirm(string userType, ApplicationDbContext db)
        {
            switch (userType)
            {
                case "sender":
                    this.SenderConfirmReceieved = true;

                    break;

                case "receiver":
                    this.ReceiverConfirmReceieved = true;

                    break;
                default:
                    break;
            }

            db.Entry(this).State = EntityState.Modified;
            db.SaveChanges();
            SwapItems(this, userType, db);
        }
        private void HoldItems(string itemListJSON, UserCollection userCollection, Swap swap, ApplicationDbContext db)
        {
            var deserializedReceiverItems = JsonConvert.DeserializeObject<List<int>>(userCollection.ItemCountJSON);
            var deserializedSwapItems = JsonConvert.DeserializeObject<List<int>>(itemListJSON);

            foreach (var item in deserializedSwapItems)
            {
                deserializedReceiverItems[item] = deserializedReceiverItems[item] - 1;
            }
            userCollection.ItemCountJSON = JsonConvert.SerializeObject(deserializedReceiverItems);

            HeldItems heldItems = new HeldItems
            {
                ItemListJSON = itemListJSON,
                UserCollection = userCollection,
                Swap = swap
            };

            db.Entry(userCollection).State = EntityState.Modified;
            db.HeldItems.Add(heldItems);
            db.SaveChanges();
        }
        private void ReleaseItems(Swap swap, ApplicationDbContext db)
        {
            var heldItems = db.HeldItems.Include("UserCollection").Where(hi => hi.Swap.Id == swap.Id).ToList();

            foreach (var item in heldItems)
            {
                var userCollection = db.UserCollections.Find(item.UserCollection.Id);
                var deserializedReleaseItems = JsonConvert.DeserializeObject<List<int>>(item.ItemListJSON);
                var deserializedItems = JsonConvert.DeserializeObject<List<int>>(userCollection.ItemCountJSON);

                foreach (var deserializedItem in deserializedReleaseItems)
                {
                    deserializedItems[deserializedItem] = deserializedItems[deserializedItem] + 1;
                }

                userCollection.ItemCountJSON = JsonConvert.SerializeObject(deserializedItems);
                db.Entry(userCollection).State = EntityState.Modified;
                db.SaveChanges();
            }

            db.HeldItems.RemoveRange(heldItems);
            db.SaveChanges();
        }
        private void SwapItems(Swap swap, string userType, ApplicationDbContext db)
        {
            var heldItems = new HeldItems();
            var userCollection = new UserCollection();
            switch (userType)
            {
                case "sender":
                    // Find the items that DO NOT belong to to sender
                    heldItems = db.HeldItems.Include("UserCollection").Where(
                                                                            hi => hi.Swap.Id == swap.Id &&
                                                                            hi.UserCollection.UserId != swap.SenderId)
                                                                            .FirstOrDefault();

                    // Define the User Collection that will be getting updated as the senders
                    userCollection = db.UserCollections.Find(swap.SenderUserCollectionId);
                    break;

                case "receiver":
                    // Find the items that DO NOT belong to to receiver
                    heldItems = db.HeldItems.Include("UserCollection").Where(
                                                                        hi => hi.Swap.Id == swap.Id &&
                                                                        hi.UserCollection.UserId != swap.ReceiverId)
                                                                        .FirstOrDefault();

                    // Define the User Collection that will be getting updated as the receivers
                    userCollection = db.UserCollections.Find(swap.ReceiverUserCollectionId);
                    break;
                default:
                    break;
            }

            var deserializedSwapItems = JsonConvert.DeserializeObject<List<int>>(heldItems.ItemListJSON);
            var deserializedItems = JsonConvert.DeserializeObject<List<int>>(userCollection.ItemCountJSON);

            foreach (var deserializedItem in deserializedSwapItems)
            {
                deserializedItems[deserializedItem] += 1;
            }

            userCollection.ItemCountJSON = JsonConvert.SerializeObject(deserializedItems);
            db.Entry(userCollection).State = EntityState.Modified;

            db.HeldItems.Remove(heldItems);
            db.SaveChanges();
        }
    }

    public class SwapRequestViewModel
    {
        public int SwapId { get; set;}
        [Required]
        public string ReceiverId { get; set; }
        [Required]
        public int CollectionId { get; set; }
        [Required]
        public int SenderUserCollectionId { get; set; }
        [Required]
        public int ReceiverUserCollectionId { get; set; }
        [Required]
        public string SenderItems { get; set; }
        [Required]
        public string RequestedItems { get; set; }
        [Required]
        public DateTimeOffset StartDate { get; set; }
        [Required]
        public string Status { get; set; }
    }

    public class OfferViewModel
    {
        [Required]
        public string SenderId { get; set; }
        [Required]
        public string ReceiverId { get; set; }
        [Required]
        public int CollectionId { get; set; }
        [Required]
        public int SenderUserCollectionId { get; set; }
        [Required]
        public int ReceiverUserCollectionId { get; set; }
        [Required]
        public string SenderItems { get; set; }
        [Required]
        public string RequestedItems { get; set; }
        [Required]
        public string Status { get; set; }
    }

    public class Feedback
    {
        public int Id { get; set; }
        public int SwapId { get; set; }
        public string SenderId { get; set; }
        public string ReceiverId { get; set; }
        [Required(ErrorMessage = "You must select a rating")]
        public int Rating { get; set; }
        public string PositiveFeedback { get; set; }
        public string NeutralFeedback { get; set; }
        public string NegativeFeedback { get; set; }
        public Feedback Create(string userId, ApplicationDbContext db)
        {
            if (db.Feedbacks.Find(this.Id) != null)
            {
                return this;
            }
            this.SenderId = userId;
            this.ReceiverId = db.Swaps.Find(this.SwapId).SenderId == userId ? db.Swaps.Find(this.SwapId).ReceiverId : db.Swaps.Find(this.SwapId).SenderId;

            db.Feedbacks.Add(this);
            db.SaveChanges();

            return this;
        }
    }
}