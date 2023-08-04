﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Routing;

namespace CollectionSwap
{
    public class RouteConfig
    {
        public static void RegisterRoutes(RouteCollection routes)
        {
            routes.IgnoreRoute("{resource}.axd/{*pathInfo}");

            routes.MapRoute(
                name: "LoadPartial",
                url: "Manage/LoadPartial/{id}",
                defaults: new { controller = "Manage", action = "LoadPartial", id = UrlParameter.Optional }
            );

            routes.MapRoute(
                name: "Redirect",
                url: "Manage/{id}",
                defaults: new { controller = "Manage", action = "Index", id = UrlParameter.Optional }
            );

            routes.MapRoute(
                name: "Default",
                url: "{controller}/{action}/{id}",
                defaults: new { controller = "Home", action = "Index", id = UrlParameter.Optional }
            );
        }
    }
}
