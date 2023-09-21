﻿const navUl = $(".manage-container-nav ul");
const subNavLinks = navUl.find("a");
var scrollTop = $(window).scrollTop();

// Map the values of our partial views to an array
const partialNames = subNavLinks.map(function () {
    return $(this).text().replace(' ', '');
}).get();

// Get the current partial views name and id if there is one
var partialName = location.pathname.split("/Manage/").pop().split("/")[0];
var partialId = location.pathname.split("/Manage/").pop().split("/")[1];

// If user has navigated to a page not within our partialNames array redirect them them to the Account partial
if (!partialNames.includes(partialName)) {
    partialName = "SwapHistory";
}

// Find the link index of the the currently active partial view
var selectedNavLink = subNavLinks.parent().find(`[href='/Manage/${partialName}']`)
var selectedIndex = subNavLinks.index(selectedNavLink);

// Animate the link highlight to the correct position
navUl.find("li").removeClass("selected");
navUl.find("li").eq(selectedIndex).addClass("selected");

// Display the partial view
LoadPartial(partialName, `/Manage/${partialName}`)

if (partialId) {
    const formData = new FormData();
    var action = partialName.replace("ManageCollections", "EditCollection").replace("YourCollections", "UserCollection").replace("FindSwaps", "DisplaySwapMatches").replace("SwapHistory", "SwapHistoryPartial");

    formData.append("id", partialId);
    HandleFormSubmit(`/Manage/${action}`, "POST", formData);
}

// On back/forward navigation update the partial name and display the corresponding view
$(window).on("popstate", function (e) {
    partialName = partialName == "Index" ? "SwapHistory" : location.pathname.split("/Manage")[1] == "" ? "SwapHistory" : location.pathname.split("/Manage/").pop().split("/")[0]
    partialId = location.pathname.split("/Manage/").pop().split("/")[1];
    LoadPartial(partialName, `/Manage/${partialName}`)
    if (partialId) {
        const formData = new FormData();
        const action = partialName.replace("ManageCollections", "EditCollection").replace("YourCollections", "UserCollection").replace("FindSwaps", "DisplaySwapMatches").replace("SwapHistory", "SwapHistoryPartial");
        formData.append("id", partialId);

        HandleFormSubmit(`/Manage/${action}`, "POST", formData);
    }
});

// Automatically submit the form when changing an items image
$(document).on("change", "#items input[type='file']", function (e) {
    e.preventDefault();
    $(this).closest("form").submit();
});

// Subnav click listeners
$(document).on("click", ".manage-container-nav a", function (event) {
    event.preventDefault();
    const url = $(this).attr("href").split("/Manage/").pop().split("/");
    partialName = url[0];
    partialId = url[1] == '#' ? '' : url[1];

    const historyEntry = partialId == undefined ? partialName : `${partialName}/${partialId}`;
    history.pushState({ partialName: historyEntry }, null, `/Manage/${historyEntry}`);

    LoadPartial(partialName, $(this).attr("href"));
});

// Anchor click listeners
$(document).on("click", ".load-content", function (event) {
    event.preventDefault();
    $("#create-user-collection-container").addClass("d-none");
    const controller = $(this).attr("href").split("/")[1];
    var action = $(this).attr("href").split("/")[2];
    const id = $(this).attr("href").split("/")[3];

    const historyEntry = id == undefined ? action : `${action}/${id}`;
    history.pushState({ partialName: action }, null, `/${controller}/${historyEntry}`);

    const formData = new FormData();
    formData.append(action == "Member" ? "username" : "id", id);

    action = action.replace("ManageCollections", "EditCollection").replace("YourCollections", "UserCollection").replace("FindSwaps", "DisplaySwapMatches").replace("SwapHistory", "SwapHistoryPartial");;

    HandleFormSubmit(`/${controller}/${action}`, "POST", formData);
});

// Form submit listeners Handle loading form submission partial views
$(document).on("submit", ".manage-container-main form, #home-container form", function (event) {
    event.preventDefault();
    var formData = new FormData(this);

    if (this.id == "feedback-form") {
        var rating = $(".star-button.selected").length > 0 ? $(".star-button.selected").length : null;
        var comments = [];

        $("#Feedback_Rating").val(rating);

        $(".feedback-list .selected").each(function () {
            comments.push($(this).text());
        });

        $("#Feedback_Comments").val(JSON.stringify(comments));
        formData = new FormData(this);
    }
    HandleFormSubmit($(this).attr("action"), $(this).attr("method"), formData);
});

// Handle loading the navigation partial views
function LoadPartial(partialName, url) {
    selectedNavLink = subNavLinks.parent().find(`[href='/Manage/${partialName.split("/")[0]}']`)
    selectedIndex = subNavLinks.index(selectedNavLink);
    navUl.find("li").removeClass("selected");
    navUl.find("li").eq(selectedIndex).addClass("selected");

    $.ajax({
        url: `${url}Partial`,
        type: "POST",
        success: function (result) {
            $('.manage-container-main').html(result.PartialView);
        },
        error: function () {
            // Handle error
        }
    });
}

function HandleFormSubmit(url, type, formData) {
    $.ajax({
        url: url,
        type: type,
        data: formData,
        processData: false,
        contentType: false,
        success: function (result) {
            var partialView = result.PartialView;

            if (result.RefreshTargets) {
                $.each(result.RefreshTargets, function (key, target) {
                    if (`#${$(partialView).attr("id")}` === target || `.${$(partialView).attr("class")}` == target) {
                        $(`${target}`).prop("outerHTML", $(partialView).prop("outerHTML"));
                    } else {
                        $(`${target}`).prop("outerHTML", $(partialView).find(target).prop("outerHTML"));
                    }
                    $(`${target}`).removeClass("d-none");
                });
            }

            if (result.ScrollTarget) {
                var offset = $(result.ScrollTarget).prop("offsetLeft");
                $(result.ScrollTarget).parent().css("scroll-snap-type", "none");

                $(document).scrollTop(0);
                $(result.ScrollTarget).parent().animate({ scrollLeft: offset }, 250, "swing", () => {
                    $(result.ScrollTarget).parent().css("scroll-snap-type", "x mandatory")
                });
            }

            if (result.ScrollRowBack) {
                var button = $(".scroll-row-button");
                ScrollRowBack(button);
            }

            if (result.FormResetTarget) {
                ResetHomePageSponsorForms();
                $(":input", result.FormResetTarget)
                    .not(":button, :submit, :reset, :hidden")
                    .val("")
                    .prop("checked", false)
                    .prop("selected", false);
            }
        },
        error: function () {
            // Handle error
        }
    });
}

function OpenCreateUserCollection(e) {
    var scrollRow = $(e).closest(".scroll-snap-row");
    scrollRow.css("scroll-snap-type", "none");
    $("#create-user-collection-container").removeClass("d-none");
    $("#user-collection-container").addClass("d-none");

    scrollRow.animate({ scrollLeft: 1100 }, 200, "swing", () => {
        $(document).scrollTop(0);
        scrollRow.css("scroll-snap-type", "x mandatory")
    });
}

function ScrollRowBack(e) {
    var scrollRow = $(e).closest(".scroll-snap-row");
    scrollRow.css("scroll-snap-type", "none");
    history.pushState({ partialName: partialName }, null, `/Manage/${partialName}`);

    scrollRow.animate({ scrollLeft: 0 }, 250, "swing", () => {
        var numChildren = scrollRow.children().length;
        console.log(numChildren);
        $(document).scrollTop(0);
        scrollRow.css("scroll-snap-type", "x mandatory");
        scrollRow.children("div:gt(1)").addClass("d-none");
    });
}

$(document).on("click", ".counter-add, .counter-minus", function () {
    let input = $(this).parent().find("[name='quantity']");
    let itemId = input.prop("id");
    let change = $(this).hasClass("counter-add") ? 1 : -1;
    let quantity = (+input.val() + change) > 0 ? (+input.val() + change) > 99 ? 99 : +input.val() + change : 0;

    input.val(quantity);
    if (quantity == 0) {
        $(this).parent().parent().parent().prev().addClass("item-not-owned");
    }
    if (quantity == 1) {
        $(this).parent().parent().parent().prev().removeClass("item-not-owned");
    }
});

$(document).on("input", "#user-collection-container [type='number']", function () {
    let input = $(this);
    let itemId = input.prop("id");
    let quantity = +input.val()

    if (quantity < 0) {
        input.val(0);
        $(this).parent().parent().parent().prev().removeClass("item-not-owned");
    }
});

// Feedback option toggle
$(document).on("click", ".feedback-list li", function () {
    if ($(".feedback-form-container .submit-button").is(":disabled")) {
        return;
    }
    $(this).toggleClass("selected");
});

// Feedback star toggle
$(document).on("click", ".star-button", function () {
    if ($(".feedback-form-container .submit-button").is(":disabled")) {
        return;
    }
    const index = $(".star-button").index(this);

    $(".star-button").removeClass("selected");

    // Star buttons are displayed rtl so we loop from clicked index to 5
    for (var i = index; i < 5; i++) {
        $(".star-button").eq(i).addClass("selected");
    }
});

$(document).on("click", ".confirm-sent-items > a", function (event) {
    event.preventDefault();
    const formData = new FormData();
    formData.append("id", $(this).data("swap-id"));
    formData.append("type", "sent");

    HandleFormSubmit("/Manage/ConfirmSentReceived", "POST", formData);
});

// Items sent / received checkbox listener
$(document).on("change", ".swap-confirm", function () {
    if (this.checked) {
        var status = $(this).closest("tr").find(".swap-capstone p").text();
        if (status != "confirmed" && status != "Items Sent") {
            this.checked = false;
        }
        else {
            const confirmed = confirm("By confirming, you acknowledge that you've received the items and this setting cannot be changed later. Are you sure?");
            if (!confirmed) {
                this.checked = false;
            }
            else {
                const formData = new FormData();
                formData.append("id", $(this).data("swap-id"));
                formData.append("type", $(this).data("type"));

                HandleFormSubmit("/Manage/ConfirmSentReceived", "POST", formData);
            }
        }
    } else {
        //this.checked = true;
    }
});

// Charity collection checkbox listener
$(document).on("change", ".charity-checkbox", function () {
    const formData = new FormData();
    formData.append("id", $(this).data("user-collection-id"));

    HandleFormSubmit("/Manage/ToggleCharityCollection", "POST", formData);
});

$(document).on("click", ".swap-history-filters > span", function () {
    $(".swap-history-filters > span").removeClass("selected");
    $(this).addClass("selected");
    const formData = new FormData();
    formData.append("displayStatus", $(this).data("status"));

    HandleFormSubmit("/Manage/FilterSwaps", "POST", formData);
});

function EditSponsor(e) {
    const form = $("#edit-sponsor-form")[0];

    const statement = $(".sponsor-statement.admin");
    if (statement.text().includes("<")) {
        statement.prop("innerHTML", statement.text());
    }

    const formData = new FormData(form);
    formData.append("statement", statement.prop("innerHTML"));

    HandleFormSubmit("/Manage/EditSponsor", "POST", formData);
}

function EditHomeSponsors(e) {
    const editButton = $(e);
    const buttontext = editButton.text();
    const links = $(".sponsors a");
    const addSponsorForm = $("#add-sponsor-form");
    
    editButton.text(buttontext == "Edit" ? "Close" : "Edit");
    $(".add-sponsor").toggleClass("editing");
    addSponsorForm.css({ display: "flex" });

    if (buttontext == "Close") {
        ResetEditingSponsor();
    }
}

$(document).on("click", ".add-sponsor.editing a", function (e) {
    e.preventDefault();
    const selectedImage = $(e.target);

    const addSponsorForm = $("#add-sponsor-form");
    const editSponsorForm = $("#edit-sponsor-form");
    const imageUpload = editSponsorForm.find(".sponsor-image.placeholder");
    const url = editSponsorForm.find("#Url");

    editSponsorForm.css({ display: "flex" });
    addSponsorForm.css({ display: "none" });
    imageUpload.parent().removeClass("placeholder");

    editSponsorForm.find("input#Id").val(selectedImage.data("id"))
    imageUpload[0].src = selectedImage[0].src;
    url.val(selectedImage.parent().prop("href"));
});

function ResetEditingSponsor() {
    const editSponsorForm = $("#edit-sponsor-form");
    const addSponsorForm = $("#add-sponsor-form");

    $(".add-sponsor").removeClass("editing");
    editSponsorForm[0].reset();
    addSponsorForm[0].reset();
    editSponsorForm.css({ display: "none"});
    addSponsorForm.css({ display: "none"});
}

$(document).on("change", ".add-sponsor input[type='file'], .user-collection-sponsor-container input[type='file']", function (e) {
    e.preventDefault();
    if (this.files && this.files[0]) {
        var self = $(this);
        var reader = new FileReader();

        reader.onload = function (e) {
            self.prev().find(".sponsor-image.placeholder").parent().removeClass("placeholder");
            self.prev().find(".sponsor-image.placeholder").attr('src', e.target.result);
        }

        reader.readAsDataURL(this.files[0]);
    }
});

$(document).on("reset", ".add-sponsor form", ResetHomePageSponsorForms);

function ResetHomePageSponsorForms() {
    const editSponsorForm = $("#edit-sponsor-form");
    const addSponsorForm = $("#add-sponsor-form");
    editSponsorForm.find(".sponsor-image.placeholder").prop("src", "/Content/images/scrollbar.png");
    addSponsorForm.find(".sponsor-image.placeholder").prop("src", "/Content/images/scrollbar.png");
    editSponsorForm.find("label.admin").addClass("placeholder");
    addSponsorForm.find("label.admin").addClass("placeholder");
    $("#edit-sponsor-form").css({ display: "none" });
    $("#add-sponsor-form").css({ display: "flex" });
}